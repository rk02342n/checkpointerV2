import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { db } from "../db";
import { gamesTable, gamesSelectSchema, gameParamsSchema } from "../db/schema/games";
import { eq, desc, sum, and, ilike, or, avg } from "drizzle-orm";
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
