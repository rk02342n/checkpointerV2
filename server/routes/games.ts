import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from "../db";
import { gamesTable, gamesSelectSchema, gameParamsSchema } from "../db/schema/games";
import { eq, desc, asc, sum, and, ilike, or, avg, gte, lt, sql, exists, inArray } from "drizzle-orm";
import { reviewsTable } from "../db/schema/reviews";
import { genresTable } from "../db/schema/genres";
import { platformsTable } from "../db/schema/platforms";
import { keywordsTable } from "../db/schema/keywords";
import { gameGenresTable } from "../db/schema/game-genres";
import { gamePlatformsTable } from "../db/schema/game-platforms";
import { gameKeywordsTable } from "../db/schema/game-keywords";
import { gameImagesTable } from "../db/schema/game-images";
import { gameLinksTable } from "../db/schema/game-links";

async function getPlatformsForGames(gameIds: string[]) {
  if (gameIds.length === 0) return new Map<string, { id: string; name: string; slug: string; abbreviation: string | null }[]>();
  const rows = await db
    .select({
      gameId: gamePlatformsTable.gameId,
      id: platformsTable.id,
      name: platformsTable.name,
      slug: platformsTable.slug,
      abbreviation: platformsTable.abbreviation,
    })
    .from(gamePlatformsTable)
    .innerJoin(platformsTable, eq(gamePlatformsTable.platformId, platformsTable.id))
    .where(inArray(gamePlatformsTable.gameId, gameIds));

  const map = new Map<string, { id: string; name: string; slug: string; abbreviation: string | null }[]>();
  for (const row of rows) {
    const list = map.get(row.gameId) ?? [];
    list.push({ id: row.id, name: row.name, slug: row.slug, abbreviation: row.abbreviation });
    map.set(row.gameId, list);
  }
  return map;
}

export const gamesRoute = new Hono()

.get("/", async (c) => {
  const games = await db
    .select()
    .from(gamesTable)
    .orderBy(desc(gamesTable.igdbRating))
    .limit(40);

  const platformMap = await getPlatformsForGames(games.map(g => g.id));
  const gamesWithPlatforms = games.map(g => ({ ...g, platforms: platformMap.get(g.id) ?? [] }));

  return c.json({ games: gamesWithPlatforms });
})

// Search games
.get("/search", async (c) => {
  const searchQuery = c.req.query("q");
  if (!searchQuery || searchQuery.trim().length === 0) {
    return c.json({ games: [] }); // or return an error
  }

  const searchTerm = `%${searchQuery.trim()}%`;
  const games = await db
    .select()
    .from(gamesTable)
    .where(ilike(gamesTable.name, searchTerm))
    .limit(20)
    .orderBy(desc(gamesTable.igdbRating));
  return c.json({ games });
})

// List all genres
.get("/genres", async (c) => {
  const genres = await db.select().from(genresTable).orderBy(asc(genresTable.name));
  return c.json({ genres });
})

// List all platforms
.get("/platforms", async (c) => {
  const platforms = await db.select().from(platformsTable).orderBy(asc(platformsTable.name));
  return c.json({ platforms });
})

// List all keywords
.get("/keywords", async (c) => {
  const keywords = await db.select().from(keywordsTable).orderBy(asc(keywordsTable.name));
  return c.json({ keywords });
})

// Browse games with filtering and sorting
.get("/browse", async (c) => {
  const searchQuery = c.req.query("q") || "";
  const sortBy = c.req.query("sortBy") || "rating"; // rating, year, name
  const sortOrder = c.req.query("sortOrder") || "desc"; // asc, desc
  const yearFilter = c.req.query("year") || "all";
  const genreFilter = c.req.query("genre") || "";
  const platformFilter = c.req.query("platform") || "";
  const limit = Math.min(parseInt(c.req.query("limit") || "50"), 100);
  const offset = parseInt(c.req.query("offset") || "0");

  // Build conditions array
  const conditions = [];

  // Search filter
  if (searchQuery.trim()) {
    conditions.push(ilike(gamesTable.name, `%${searchQuery.trim()}%`));
  }

  // Year filter
  if (yearFilter !== "all") {
    const year = parseInt(yearFilter);
    if (!isNaN(year)) {
      const startOfYear = new Date(year, 0, 1);
      const startOfNextYear = new Date(year + 1, 0, 1);
      conditions.push(gte(gamesTable.releaseDate, startOfYear));
      conditions.push(lt(gamesTable.releaseDate, startOfNextYear));
    }
  }

  // Genre filter (by slug) using EXISTS subquery
  if (genreFilter.trim()) {
    conditions.push(
      exists(
        db.select({ one: sql`1` })
          .from(gameGenresTable)
          .innerJoin(genresTable, eq(gameGenresTable.genreId, genresTable.id))
          .where(and(
            eq(gameGenresTable.gameId, gamesTable.id),
            eq(genresTable.slug, genreFilter.trim())
          ))
      )
    );
  }

  // Platform filter (by slug) using EXISTS subquery
  if (platformFilter.trim()) {
    conditions.push(
      exists(
        db.select({ one: sql`1` })
          .from(gamePlatformsTable)
          .innerJoin(platformsTable, eq(gamePlatformsTable.platformId, platformsTable.id))
          .where(and(
            eq(gamePlatformsTable.gameId, gamesTable.id),
            eq(platformsTable.slug, platformFilter.trim())
          ))
      )
    );
  }

  // Determine sort column and order
  let orderByColumn;
  switch (sortBy) {
    case "year":
      orderByColumn = gamesTable.releaseDate;
      break;
    case "name":
      orderByColumn = gamesTable.name;
      break;
    case "rating":
    default:
      orderByColumn = gamesTable.igdbRating;
      break;
  }

  const orderFn = sortOrder === "asc" ? asc : desc;

  // Build query
  let query = db.select().from(gamesTable);

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const gamesRaw = await query
    .orderBy(orderFn(orderByColumn))
    .limit(limit)
    .offset(offset);

  const platformMap = await getPlatformsForGames(gamesRaw.map(g => g.id));
  const games = gamesRaw.map(g => ({ ...g, platforms: platformMap.get(g.id) ?? [] }));

  // Get total count for pagination
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(gamesTable);
  if (conditions.length > 0) {
    countQuery = countQuery.where(and(...conditions)) as typeof countQuery;
  }
  const countResult = await countQuery;
  const totalCount = countResult[0]?.count ?? 0;

  // Get unique years for filter dropdown
  const yearsResult = await db
    .select({ year: sql<number>`DISTINCT EXTRACT(YEAR FROM ${gamesTable.releaseDate})` })
    .from(gamesTable)
    .where(sql`${gamesTable.releaseDate} IS NOT NULL`)
    .orderBy(desc(sql`EXTRACT(YEAR FROM ${gamesTable.releaseDate})`));

  const years = yearsResult
    .map(r => r.year)
    .filter(y => y != null)
    .map(y => String(Math.floor(y)));

  // Get all genres and platforms for filter dropdowns
  const [genres, platforms] = await Promise.all([
    db.select().from(genresTable).orderBy(asc(genresTable.name)),
    db.select().from(platformsTable).orderBy(asc(platformsTable.name)),
  ]);

  return c.json({
    games,
    totalCount: Number(totalCount),
    years,
    genres,
    platforms,
    pagination: {
      limit,
      offset,
      hasMore: offset + games.length < Number(totalCount)
    }
  });
})
.get("/:id", zValidator('param', gameParamsSchema), async c => {  // regex makes sure we get a number as a request
  const id = c.req.param('id');

  const [gameResult, genres, platforms, keywords, images, links] = await Promise.all([
    db.select().from(gamesTable).where(eq(gamesTable.id, id)).then(res => res[0]),
    db.select({ id: genresTable.id, name: genresTable.name, slug: genresTable.slug })
      .from(genresTable)
      .innerJoin(gameGenresTable, eq(genresTable.id, gameGenresTable.genreId))
      .where(eq(gameGenresTable.gameId, id)),
    db.select({ id: platformsTable.id, name: platformsTable.name, slug: platformsTable.slug, abbreviation: platformsTable.abbreviation })
      .from(platformsTable)
      .innerJoin(gamePlatformsTable, eq(platformsTable.id, gamePlatformsTable.platformId))
      .where(eq(gamePlatformsTable.gameId, id)),
    db.select({ id: keywordsTable.id, name: keywordsTable.name, slug: keywordsTable.slug })
      .from(keywordsTable)
      .innerJoin(gameKeywordsTable, eq(keywordsTable.id, gameKeywordsTable.keywordId))
      .where(eq(gameKeywordsTable.gameId, id)),
    db.select().from(gameImagesTable).where(eq(gameImagesTable.gameId, id)).orderBy(asc(gameImagesTable.position)),
    db.select().from(gameLinksTable).where(eq(gameLinksTable.gameId, id)),
  ]);

  if (!gameResult) {
    return c.json({ error: 'Game not found' }, 404)
  }
  return c.json({ game: gameResult, genres, platforms, keywords, images, links });
})

// .post("/", zValidator("json", createExpenseSchema), getUser, async c => { // zValidator middleware validation function
//     const user = c.var.user
//     const expense = await c.req.valid("json");
//     const validatedExpense = expensesInsertSchema.parse({
//         ...expense,
//         userId: user.id,
//     })

//     const result = await db
//     .insert(expensesTable)
//     .values(validatedExpense)
//     .returning()
//     .then(res => res[0]);
//     c.status(201)
//     return c.json(result);
// })
// Average rating for a game by its ID
.get("/rating/:id", async c => {
    const id = c.req.param('id');
    const result = await db.select({ total: avg(reviewsTable.rating) })
        .from(reviewsTable)
        .where(eq(reviewsTable.gameId, id))
        .then(res => res[0]);
    return c.json(result);
})

// })
// .delete("/:id{[0-9]+}", getUser, async c => {  // regex makes sure we get a number as a request
//     const id = Number.parseInt(c.req.param('id'))
//     const user = c.var.user // we can grab the user like this
//     const expense = await db
//     .delete(expensesTable)
//     .where(and(eq(expensesTable.userId, user.id), eq(expensesTable.id, id)))
//     .returning()
//     .then(res => res[0])

//     if (!expense){
//         return c.notFound();
//     }
//     return c.json({expense: expense})

// })
