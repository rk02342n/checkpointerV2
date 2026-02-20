import { db } from "../db";
import { gamesTable } from "../db/schema/games";
import { genresTable } from "../db/schema/genres";
import { platformsTable } from "../db/schema/platforms";
import { keywordsTable } from "../db/schema/keywords";
import { gameGenresTable } from "../db/schema/game-genres";
import { gamePlatformsTable } from "../db/schema/game-platforms";
import { gameKeywordsTable } from "../db/schema/game-keywords";
import { gameImagesTable } from "../db/schema/game-images";
import { gameLinksTable } from "../db/schema/game-links";

import {
  getIgdbToken,
  fetchIgdb,
  chunk,
  delay,
  igdbImageUrl,
  IGDB_DELAY_MS,
  IGDB_WEBSITE_CATEGORY_MAP,
  type LinkCategory,
  type ImageType,
} from "../lib/igdb";

import { bulkInsertIgnore } from "../lib/sync-helpers";

interface IgdbGame {
  id: number;
  genres?: { id: number; name: string; slug: string }[];
  platforms?: { id: number; name: string; slug: string; abbreviation?: string }[];
  keywords?: { id: number; name: string; slug: string }[];
  screenshots?: { image_id: string; width?: number; height?: number }[];
  artworks?: { image_id: string; width?: number; height?: number }[];
  websites?: { category: number; url: string }[];
}

async function fetchIgdbBatch(
  igdbIds: number[],
  token: string,
  clientId: string
): Promise<IgdbGame[]> {
  const body = `
    fields genres.name, genres.slug,
           platforms.name, platforms.slug, platforms.abbreviation,
           keywords.name, keywords.slug,
           screenshots.image_id, screenshots.width, screenshots.height,
           artworks.image_id, artworks.width, artworks.height,
           websites.category, websites.url;
    where id = (${igdbIds.join(",")});
    limit 500;
  `;

  return fetchIgdb<IgdbGame[]>("games", body, token, clientId);
}

async function main() {
  console.log("Starting IGDB metadata seed...");

  const token = await getIgdbToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;
  console.log("Authenticated with IGDB");

  // Get all games from DB
  const games = await db.select({ id: gamesTable.id, igdbId: gamesTable.igdbId }).from(gamesTable);
  console.log(`Found ${games.length} games in database`);

  // Build igdbId -> gameId map
  const igdbToGameId = new Map<number, string>();
  for (const g of games) {
    igdbToGameId.set(g.igdbId, g.id);
  }

  const igdbIds = games.map((g) => g.igdbId);
  const batches = chunk(igdbIds, 500);

  // Persistent lookup maps (igdbId -> our UUID), built once and updated per batch
  let genreIgdbToId = new Map<number | null, string>();
  let platformIgdbToId = new Map<number | null, string>();
  let keywordIgdbToId = new Map<number | null, string>();

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]!;
    console.log(`\nBatch ${i + 1}/${batches.length} — fetching ${batch.length} games from IGDB...`);

    const igdbGames = await fetchIgdbBatch(batch, token, clientId);
    console.log(`  Received ${igdbGames.length} games from IGDB`);

    // --- 1. Collect unique lookup entities from this batch ---
    const genreMap = new Map<number, { name: string; slug: string }>();
    const platformMap = new Map<number, { name: string; slug: string; abbreviation?: string }>();
    const keywordMap = new Map<number, { name: string; slug: string }>();

    for (const ig of igdbGames) {
      if (ig.genres) {
        for (const g of ig.genres) genreMap.set(g.id, { name: g.name, slug: g.slug });
      }
      if (ig.platforms) {
        for (const p of ig.platforms) platformMap.set(p.id, { name: p.name, slug: p.slug, abbreviation: p.abbreviation });
      }
      if (ig.keywords) {
        for (const k of ig.keywords) keywordMap.set(k.id, { name: k.name, slug: k.slug });
      }
    }

    // --- 2. Upsert lookup tables ---
    if (genreMap.size > 0) {
      await bulkInsertIgnore(db,genresTable,
        Array.from(genreMap.entries()).map(([igdbId, d]) => ({ igdbId, name: d.name, slug: d.slug }))
      );
    }
    if (platformMap.size > 0) {
      await bulkInsertIgnore(db,platformsTable,
        Array.from(platformMap.entries()).map(([igdbId, d]) => ({ igdbId, name: d.name, slug: d.slug, abbreviation: d.abbreviation ?? null }))
      );
    }
    if (keywordMap.size > 0) {
      await bulkInsertIgnore(db,keywordsTable,
        Array.from(keywordMap.entries()).map(([igdbId, d]) => ({ igdbId, name: d.name, slug: d.slug }))
      );
    }

    // --- 3. Refresh lookup maps (only when new entities were added) ---
    if (genreMap.size > 0 || i === 0) {
      const rows = await db.select({ igdbId: genresTable.igdbId, id: genresTable.id }).from(genresTable);
      genreIgdbToId = new Map(rows.map((r) => [r.igdbId, r.id]));
    }
    if (platformMap.size > 0 || i === 0) {
      const rows = await db.select({ igdbId: platformsTable.igdbId, id: platformsTable.id }).from(platformsTable);
      platformIgdbToId = new Map(rows.map((r) => [r.igdbId, r.id]));
    }
    if (keywordMap.size > 0 || i === 0) {
      const rows = await db.select({ igdbId: keywordsTable.igdbId, id: keywordsTable.id }).from(keywordsTable);
      keywordIgdbToId = new Map(rows.map((r) => [r.igdbId, r.id]));
    }

    // --- 4. Collect ALL junction + image + link rows for the entire batch ---
    const allGenreJunctions: { gameId: string; genreId: string }[] = [];
    const allPlatformJunctions: { gameId: string; platformId: string }[] = [];
    const allKeywordJunctions: { gameId: string; keywordId: string }[] = [];
    const allImageRows: { gameId: string; igdbImageId: string; imageType: ImageType; url: string; width: number | null; height: number | null; position: number }[] = [];
    const allLinkRows: { gameId: string; category: LinkCategory; url: string; label: string | null }[] = [];

    for (const ig of igdbGames) {
      const gameId = igdbToGameId.get(ig.id);
      if (!gameId) continue;

      // Genre junctions
      if (ig.genres) {
        for (const g of ig.genres) {
          const genreId = genreIgdbToId.get(g.id);
          if (genreId) allGenreJunctions.push({ gameId, genreId });
        }
      }

      // Platform junctions
      if (ig.platforms) {
        for (const p of ig.platforms) {
          const platformId = platformIgdbToId.get(p.id);
          if (platformId) allPlatformJunctions.push({ gameId, platformId });
        }
      }

      // Keyword junctions
      if (ig.keywords) {
        for (const k of ig.keywords) {
          const keywordId = keywordIgdbToId.get(k.id);
          if (keywordId) allKeywordJunctions.push({ gameId, keywordId });
        }
      }

      // Screenshots
      if (ig.screenshots) {
        ig.screenshots.forEach((s, idx) => {
          allImageRows.push({
            gameId,
            igdbImageId: s.image_id,
            imageType: "screenshot",
            url: igdbImageUrl(s.image_id),
            width: s.width ?? null,
            height: s.height ?? null,
            position: idx,
          });
        });
      }

      // Artworks
      if (ig.artworks) {
        ig.artworks.forEach((a, idx) => {
          allImageRows.push({
            gameId,
            igdbImageId: a.image_id,
            imageType: "artwork",
            url: igdbImageUrl(a.image_id),
            width: a.width ?? null,
            height: a.height ?? null,
            position: idx,
          });
        });
      }

      // Links
      if (ig.websites) {
        for (const w of ig.websites) {
          const category = (IGDB_WEBSITE_CATEGORY_MAP[w.category] || "other") as LinkCategory;
          allLinkRows.push({ gameId, category, url: w.url, label: null });
        }
      }
    }

    // --- 5. Bulk insert all rows for this batch ---
    await bulkInsertIgnore(db,gameGenresTable, allGenreJunctions);
    await bulkInsertIgnore(db,gamePlatformsTable, allPlatformJunctions);
    await bulkInsertIgnore(db,gameKeywordsTable, allKeywordJunctions);
    await bulkInsertIgnore(db,gameImagesTable, allImageRows);
    await bulkInsertIgnore(db,gameLinksTable, allLinkRows);

    console.log(`  Inserted: ${allGenreJunctions.length} genre links, ${allPlatformJunctions.length} platform links, ${allKeywordJunctions.length} keyword links, ${allImageRows.length} images, ${allLinkRows.length} links`);

    // Rate limit: wait between IGDB API calls
    if (i < batches.length - 1) {
      await delay(IGDB_DELAY_MS);
    }
  }

  console.log("\nSeed complete!");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
