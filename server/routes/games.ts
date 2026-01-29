import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { db } from "../db";
import { gamesTable, gamesSelectSchema, gameParamsSchema } from "../db/schema/games";
import { eq, desc, asc, sum, and, ilike, or, avg, gte, lt, sql } from "drizzle-orm";
import { reviewsTable } from "../db/schema/reviews";

export const gamesRoute = new Hono()

.get("/", async (c) => {
  const games = await db
    .select()
    .from(gamesTable)
    .orderBy(desc(gamesTable.igdbRating))
    .limit(40);
  return c.json({ games });
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

// Browse games with filtering and sorting
.get("/browse", async (c) => {
  const searchQuery = c.req.query("q") || "";
  const sortBy = c.req.query("sortBy") || "rating"; // rating, year, name
  const sortOrder = c.req.query("sortOrder") || "desc"; // asc, desc
  const yearFilter = c.req.query("year") || "all";
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

  const games = await query
    .orderBy(orderFn(orderByColumn))
    .limit(limit)
    .offset(offset);

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

  return c.json({
    games,
    totalCount: Number(totalCount),
    years,
    pagination: {
      limit,
      offset,
      hasMore: offset + games.length < Number(totalCount)
    }
  });
})
.get("/:id", zValidator('param', gameParamsSchema), async c => {  // regex makes sure we get a number as a request
  const id = c.req.param('id');
  const game = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, id))
    .then(res => res[0]);
  if (!game) {
    return c.json({ error: 'Game not found' }, 404)
  }
  return c.json({ game });
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
