import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { getAuthUser } from "../kinde"; // pass in getUser as middleware function to make the route authenticated
import { db } from "../db";
import { expensesTable, expensesInsertSchema } from "../db/schema/expenses";
import { reviewsTable, reviewsInsertSchema, reviewsSelectSchema, createReviewSchema } from "../db/schema/reviews";
import { eq, desc, sum, and } from "drizzle-orm";

import { createExpenseSchema } from "../sharedTypes";

export const reviewsRoute = new Hono()
// GET /reviews - Get all reviews (with optional filtering)
.get('/', getAuthUser, async (c) => {
    try {
      const gameId = c.req.query('gameId');
      const userId = c.req.query('userId');
  
      const conditions = [];
      
      if (gameId) {
        conditions.push(eq(reviewsTable.gameId, gameId));
      }
      
      if (userId) {
        conditions.push(eq(reviewsTable.userId, userId));
      }
  
      let reviews;
      
      if (conditions.length > 0) {
        reviews = await db
          .select()
          .from(reviewsTable)
          .where(conditions.length === 1 ? conditions[0] : and(...conditions))
          .orderBy(desc(reviewsTable.createdAt));
      } else {
        reviews = await db
          .select()
          .from(reviewsTable)
          .orderBy(desc(reviewsTable.createdAt));
      }
  
      return c.json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return c.json({ error: 'Failed to fetch reviews' }, 500);
    }
  })
.post("/", zValidator("json", createReviewSchema), getAuthUser, async c => {
    // const user = c.var.user // we need to get dbUserId, not kindeId - for now UI is passing it in in body
    const review = await c.req.valid("json");
    const validatedReview = reviewsInsertSchema.parse({
        ...review
    })
    const result = await db
    .insert(reviewsTable)
    .values(validatedReview)
    .returning()
    .then(res => res[0]);
    c.status(201)
    return c.json(result);
})
// .get("/total-spent", getUser, async c => {
//     // add a fake delay to test loading feature in frontend - needs to make function async for it
//     // await new Promise((r) => setTimeout(r, 2000))
//     const user = c.var.user
//     const result = await db.select({ total: sum(expensesTable.amount) })
//         .from(expensesTable)
//         .where(eq(expensesTable.userId, user.id))
//         .limit(1)
//         .then(res => res[0]) // db commands always return an array sowe have to convert it into just the first element
//     return c.json(result);
// })
// .get("/:id{[0-9]+}", getUser, async c => {  // regex makes sure we get a number as a request
//     const id = Number.parseInt(c.req.param('id'))
//     const user = c.var.user // we can grab the user like this

//     const expense = await db
//     .select()
//     .from(expensesTable)
//     .where(and(eq(expensesTable.userId, user.id), eq(expensesTable.id, id)))
//     .then(res => res[0])
//      if (!expense){
//         return c.notFound();
//     }
//     return c.json({ expense })

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
