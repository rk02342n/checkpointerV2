// IGDB Full Game Sync Script
// Usage: bun server/scripts/sync-igdb-games.ts [--full | --incremental]

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

// Use a dedicated connection with keepalive for long-running sync
const queryClient = postgres(process.env.DATABASE_URL!, {
  idle_timeout: 0,
  max_lifetime: null,
  connect_timeout: 30,
  keep_alive: 5, // send keepalive every 5 seconds
});
const db = drizzle({ client: queryClient });

import { gamesTable } from "../db/schema/games";
import { genresTable } from "../db/schema/genres";
import { platformsTable } from "../db/schema/platforms";
import { keywordsTable } from "../db/schema/keywords";
import { gameGenresTable } from "../db/schema/game-genres";
import { gamePlatformsTable } from "../db/schema/game-platforms";
import { gameKeywordsTable } from "../db/schema/game-keywords";
import { gameImagesTable } from "../db/schema/game-images";
import { gameLinksTable } from "../db/schema/game-links";
import { inArray, sql } from "drizzle-orm";

import {
  getIgdbToken,
  fetchIgdb,
  chunk,
  delay,
  igdbCoverUrl,
  igdbImageUrl,
  IGDB_BATCH_SIZE,
  IGDB_DELAY_MS,
  IGDB_WEBSITE_CATEGORY_MAP,
  type IgdbGameFull,
  type LinkCategory,
  type ImageType,
} from "../lib/igdb";

import {
  getSyncState,
  setSyncState,
  bulkInsertIgnore,
  type SyncState,
} from "../lib/sync-helpers";

// --- IGDB query template ---

const IGDB_FIELDS = `
fields name, slug, summary, first_release_date,
       cover.image_id,
       total_rating, total_rating_count, updated_at,
       genres.name, genres.slug,
       platforms.name, platforms.slug, platforms.abbreviation,
       keywords.name, keywords.slug,
       screenshots.image_id, screenshots.width, screenshots.height,
       artworks.image_id, artworks.width, artworks.height,
       websites.category, websites.url;
`.trim();

// Game type filter: main game (0), expansion (2), standalone expansion (4),
// remake (8), remaster (9), expanded game (10), port (11), fork (12), updated version (14)
const GAME_TYPE_FILTER = "where game_type = (0,2,4,8,9,10,11,12,14)";

// --- Mode detection ---

type SyncMode = "full" | "incremental";

function detectMode(state: SyncState | null): SyncMode {
  const arg = process.argv[2];
  if (arg === "--full") return "full";
  if (arg === "--incremental") return "incremental";

  // Auto-detect
  if (!state || state.status === "failed" || state.lastSyncTimestamp === 0) {
    return "full";
  }
  return "incremental";
}

// --- Batch processing ---

async function processBatch(
  igdbGames: IgdbGameFull[],
  genreIgdbToId: Map<number | null, string>,
  platformIgdbToId: Map<number | null, string>,
  keywordIgdbToId: Map<number | null, string>,
): Promise<{ maxUpdatedAt: number }> {
  if (igdbGames.length === 0) return { maxUpdatedAt: 0 };

  let maxUpdatedAt = 0;

  // --- 1. Upsert game core data ---
  const gameRows = igdbGames
    .filter((ig) => ig.name) // skip games without a name
    .map((ig) => {
      if (ig.updated_at && ig.updated_at > maxUpdatedAt) {
        maxUpdatedAt = ig.updated_at;
      }
      return {
        igdbId: ig.id,
        name: ig.name!,
        slug: ig.slug ?? null,
        summary: ig.summary ?? null,
        releaseDate: ig.first_release_date
          ? new Date(ig.first_release_date * 1000)
          : null,
        coverUrl: ig.cover?.image_id
          ? igdbCoverUrl(ig.cover.image_id)
          : null,
        igdbRating: ig.total_rating
          ? ig.total_rating.toFixed(2)
          : "0",
        updatedAt: new Date(),
      };
    });

  // Upsert in chunks to stay within parameter limits
  for (const gameChunk of chunk(gameRows, 500)) {
    await db
      .insert(gamesTable)
      .values(gameChunk)
      .onConflictDoUpdate({
        target: gamesTable.igdbId,
        set: {
          name: sql`excluded.name`,
          slug: sql`excluded.slug`,
          summary: sql`excluded.summary`,
          releaseDate: sql`excluded.release_date`,
          coverUrl: sql`excluded.cover_url`,
          igdbRating: sql`excluded.igdb_rating`,
          updatedAt: sql`excluded.updated_at`,
        },
      });
  }

  // --- 2. Get game UUID mapping for this batch ---
  const batchIgdbIds = igdbGames.filter((ig) => ig.name).map((ig) => ig.id);
  if (batchIgdbIds.length === 0) return { maxUpdatedAt };

  // Fetch in chunks since IN clause has limits
  const igdbToGameId = new Map<number, string>();
  for (const idChunk of chunk(batchIgdbIds, 500)) {
    const rows = await db
      .select({ id: gamesTable.id, igdbId: gamesTable.igdbId })
      .from(gamesTable)
      .where(inArray(gamesTable.igdbId, idChunk));
    for (const r of rows) {
      igdbToGameId.set(r.igdbId, r.id);
    }
  }

  // --- 3. Upsert lookup tables (genres, platforms, keywords) ---
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

  if (genreMap.size > 0) {
    await bulkInsertIgnore(db, genresTable,
      Array.from(genreMap.entries()).map(([igdbId, d]) => ({ igdbId, name: d.name, slug: d.slug }))
    );
  }
  if (platformMap.size > 0) {
    await bulkInsertIgnore(db, platformsTable,
      Array.from(platformMap.entries()).map(([igdbId, d]) => ({ igdbId, name: d.name, slug: d.slug, abbreviation: d.abbreviation ?? null }))
    );
  }
  if (keywordMap.size > 0) {
    await bulkInsertIgnore(db, keywordsTable,
      Array.from(keywordMap.entries()).map(([igdbId, d]) => ({ igdbId, name: d.name, slug: d.slug }))
    );
  }

  // --- 4. Refresh lookup maps if new entities were added ---
  if (genreMap.size > 0) {
    const rows = await db.select({ igdbId: genresTable.igdbId, id: genresTable.id }).from(genresTable);
    for (const r of rows) genreIgdbToId.set(r.igdbId, r.id);
  }
  if (platformMap.size > 0) {
    const rows = await db.select({ igdbId: platformsTable.igdbId, id: platformsTable.id }).from(platformsTable);
    for (const r of rows) platformIgdbToId.set(r.igdbId, r.id);
  }
  if (keywordMap.size > 0) {
    const rows = await db.select({ igdbId: keywordsTable.igdbId, id: keywordsTable.id }).from(keywordsTable);
    for (const r of rows) keywordIgdbToId.set(r.igdbId, r.id);
  }

  // --- 5. Delete existing junction/image/link rows for batch game UUIDs ---
  const gameUuids = Array.from(igdbToGameId.values());
  for (const uuidChunk of chunk(gameUuids, 500)) {
    await db.delete(gameGenresTable).where(inArray(gameGenresTable.gameId, uuidChunk));
    await db.delete(gamePlatformsTable).where(inArray(gamePlatformsTable.gameId, uuidChunk));
    await db.delete(gameKeywordsTable).where(inArray(gameKeywordsTable.gameId, uuidChunk));
    await db.delete(gameImagesTable).where(inArray(gameImagesTable.gameId, uuidChunk));
    await db.delete(gameLinksTable).where(inArray(gameLinksTable.gameId, uuidChunk));
  }

  // --- 6. Collect and insert fresh junction/image/link rows ---
  const allGenreJunctions: { gameId: string; genreId: string }[] = [];
  const allPlatformJunctions: { gameId: string; platformId: string }[] = [];
  const allKeywordJunctions: { gameId: string; keywordId: string }[] = [];
  const allImageRows: { gameId: string; igdbImageId: string; imageType: ImageType; url: string; width: number | null; height: number | null; position: number }[] = [];
  const allLinkRows: { gameId: string; category: LinkCategory; url: string; label: string | null }[] = [];

  for (const ig of igdbGames) {
    const gameId = igdbToGameId.get(ig.id);
    if (!gameId) continue;

    if (ig.genres) {
      for (const g of ig.genres) {
        const genreId = genreIgdbToId.get(g.id);
        if (genreId) allGenreJunctions.push({ gameId, genreId });
      }
    }

    if (ig.platforms) {
      for (const p of ig.platforms) {
        const platformId = platformIgdbToId.get(p.id);
        if (platformId) allPlatformJunctions.push({ gameId, platformId });
      }
    }

    if (ig.keywords) {
      for (const k of ig.keywords) {
        const keywordId = keywordIgdbToId.get(k.id);
        if (keywordId) allKeywordJunctions.push({ gameId, keywordId });
      }
    }

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

    if (ig.websites) {
      for (const w of ig.websites) {
        const category = (IGDB_WEBSITE_CATEGORY_MAP[w.category] || "other") as LinkCategory;
        allLinkRows.push({ gameId, category, url: w.url, label: null });
      }
    }
  }

  await bulkInsertIgnore(db, gameGenresTable, allGenreJunctions);
  await bulkInsertIgnore(db, gamePlatformsTable, allPlatformJunctions);
  await bulkInsertIgnore(db, gameKeywordsTable, allKeywordJunctions);
  await bulkInsertIgnore(db, gameImagesTable, allImageRows);
  await bulkInsertIgnore(db, gameLinksTable, allLinkRows);

  return { maxUpdatedAt };
}

// --- Full import ---

async function runFullSync(
  token: string,
  clientId: string,
  state: SyncState,
): Promise<void> {
  // Get total count for progress reporting
  const countResult = await fetchIgdb<{ count: number }>(
    "games/count",
    `${GAME_TYPE_FILTER};`,
    token,
    clientId,
  );
  const totalCount = countResult.count;
  console.log(`Total games to sync: ${totalCount}`);

  // Resume from last checkpoint if previous run failed
  let offset = state.status === "failed" ? state.lastCompletedOffset : 0;
  if (offset > 0) {
    console.log(`Resuming from offset ${offset} (previous run failed)`);
  }

  // Persistent lookup maps
  const genreIgdbToId = new Map<number | null, string>();
  const platformIgdbToId = new Map<number | null, string>();
  const keywordIgdbToId = new Map<number | null, string>();

  // Pre-load existing lookup maps
  const genreRows = await db.select({ igdbId: genresTable.igdbId, id: genresTable.id }).from(genresTable);
  for (const r of genreRows) genreIgdbToId.set(r.igdbId, r.id);
  const platformRows = await db.select({ igdbId: platformsTable.igdbId, id: platformsTable.id }).from(platformsTable);
  for (const r of platformRows) platformIgdbToId.set(r.igdbId, r.id);
  const keywordRows = await db.select({ igdbId: keywordsTable.igdbId, id: keywordsTable.id }).from(keywordsTable);
  for (const r of keywordRows) keywordIgdbToId.set(r.igdbId, r.id);

  let maxUpdatedAt = state.lastSyncTimestamp;
  let totalProcessed = offset > 0 ? state.totalGamesProcessed : 0;

  while (true) {
    const query = `
      ${IGDB_FIELDS}
      ${GAME_TYPE_FILTER};
      sort id asc;
      limit ${IGDB_BATCH_SIZE};
      offset ${offset};
    `;

    const igdbGames = await fetchIgdb<IgdbGameFull[]>("games", query, token, clientId);

    if (offset === 0) {
      console.log(`  First batch response: ${igdbGames.length} games`);
      if (igdbGames.length > 0) {
        console.log(`  Sample game: ${JSON.stringify(igdbGames[0], null, 2).slice(0, 200)}`);
      }
    }

    if (igdbGames.length === 0) {
      console.log("No more games to fetch. Full sync complete.");
      break;
    }

    const batchNum = Math.floor(offset / IGDB_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(totalCount / IGDB_BATCH_SIZE);
    console.log(`Batch ${batchNum}/${totalBatches} — processing ${igdbGames.length} games (offset ${offset})...`);

    const result = await processBatch(igdbGames, genreIgdbToId, platformIgdbToId, keywordIgdbToId);

    if (result.maxUpdatedAt > maxUpdatedAt) {
      maxUpdatedAt = result.maxUpdatedAt;
    }

    totalProcessed += igdbGames.length;
    offset += IGDB_BATCH_SIZE;

    // Checkpoint progress
    await setSyncState(db, {
      ...state,
      status: "running",
      lastCompletedOffset: offset,
      totalGamesProcessed: totalProcessed,
      lastSyncTimestamp: maxUpdatedAt,
      lastRunAt: new Date().toISOString(),
    });

    console.log(`  Processed ${totalProcessed}/${totalCount} games`);

    // Rate limit
    await delay(IGDB_DELAY_MS);
  }

  // Final state
  await setSyncState(db, {
    lastSyncTimestamp: maxUpdatedAt,
    lastCompletedOffset: 0,
    totalGamesProcessed: totalProcessed,
    status: "idle",
    lastRunAt: new Date().toISOString(),
  });
}

// --- Incremental sync ---

async function runIncrementalSync(
  token: string,
  clientId: string,
  state: SyncState,
): Promise<void> {
  // Buffer: go back 1 hour to catch any edge cases
  const sinceTimestamp = state.lastSyncTimestamp - 3600;
  console.log(`Incremental sync: fetching games updated since ${new Date(sinceTimestamp * 1000).toISOString()}`);

  // Pre-load lookup maps
  const genreIgdbToId = new Map<number | null, string>();
  const platformIgdbToId = new Map<number | null, string>();
  const keywordIgdbToId = new Map<number | null, string>();

  const genreRows = await db.select({ igdbId: genresTable.igdbId, id: genresTable.id }).from(genresTable);
  for (const r of genreRows) genreIgdbToId.set(r.igdbId, r.id);
  const platformRows = await db.select({ igdbId: platformsTable.igdbId, id: platformsTable.id }).from(platformsTable);
  for (const r of platformRows) platformIgdbToId.set(r.igdbId, r.id);
  const keywordRows = await db.select({ igdbId: keywordsTable.igdbId, id: keywordsTable.id }).from(keywordsTable);
  for (const r of keywordRows) keywordIgdbToId.set(r.igdbId, r.id);

  let offset = 0;
  let totalProcessed = 0;
  let maxUpdatedAt = state.lastSyncTimestamp;

  while (true) {
    const query = `
      ${IGDB_FIELDS}
      ${GAME_TYPE_FILTER} & updated_at > ${sinceTimestamp};
      sort id asc;
      limit ${IGDB_BATCH_SIZE};
      offset ${offset};
    `;

    const igdbGames = await fetchIgdb<IgdbGameFull[]>("games", query, token, clientId);

    if (igdbGames.length === 0) {
      console.log("No more updated games. Incremental sync complete.");
      break;
    }

    console.log(`Batch — processing ${igdbGames.length} updated games (offset ${offset})...`);

    const result = await processBatch(igdbGames, genreIgdbToId, platformIgdbToId, keywordIgdbToId);

    if (result.maxUpdatedAt > maxUpdatedAt) {
      maxUpdatedAt = result.maxUpdatedAt;
    }

    totalProcessed += igdbGames.length;
    offset += IGDB_BATCH_SIZE;

    console.log(`  Processed ${totalProcessed} updated games so far`);

    await delay(IGDB_DELAY_MS);
  }

  // Final state
  await setSyncState(db, {
    lastSyncTimestamp: maxUpdatedAt,
    lastCompletedOffset: 0,
    totalGamesProcessed: totalProcessed,
    status: "idle",
    lastRunAt: new Date().toISOString(),
  });
}

// --- Main ---

async function main() {
  console.log("=== IGDB Game Sync ===\n");

  const token = await getIgdbToken();
  const clientId = process.env.TWITCH_CLIENT_ID!;
  console.log("Authenticated with IGDB\n");

  const existingState = await getSyncState(db);
  const mode = detectMode(existingState);
  console.log(`Mode: ${mode}`);

  const state: SyncState = existingState ?? {
    lastSyncTimestamp: 0,
    lastCompletedOffset: 0,
    totalGamesProcessed: 0,
    status: "idle",
    lastRunAt: new Date().toISOString(),
  };

  // Mark as running
  await setSyncState(db, { ...state, status: "running", lastRunAt: new Date().toISOString() });

  try {
    if (mode === "full") {
      await runFullSync(token, clientId, state);
    } else {
      await runIncrementalSync(token, clientId, state);
    }

    console.log("\nSync complete!");
  } catch (err) {
    console.error("\nSync failed:", err);
    // Save failure state for resume
    const currentState = await getSyncState(db);
    if (currentState) {
      await setSyncState(db, {
        ...currentState,
        status: "failed",
        error: (err as Error).message,
      });
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
