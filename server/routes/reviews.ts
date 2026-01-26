import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { getAuthUser } from "../kinde"; // pass in getUser as middleware function to make the route authenticated
import { db } from "../db";
import { reviewsTable, reviewsInsertSchema, reviewsSelectSchema, createReviewSchema } from "../db/schema/reviews";
import { eq, desc, sum, and } from "drizzle-orm";
import { usersTable } from "../db/schema/users";
import { gamesTable } from "../db/schema/games";

import { createExpenseSchema } from "../sharedTypes";

export const reviewsRoute = new Hono()
// GET /reviews - Get all reviews (with optional filtering)
// Public endpoint for game reviews
// Public: all reviews for a game
.get('/game/:gameId', async (c) => {
  const gameId = c.req.param('gameId');

  const reviews = await db
    .select({
      id: reviewsTable.id,
      userId: reviewsTable.userId,
      gameId: reviewsTable.gameId,
      rating: reviewsTable.rating,
      reviewText: reviewsTable.reviewText,
      createdAt: reviewsTable.createdAt,
      username: usersTable.username,
      displayName: usersTable.displayName,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .where(eq(reviewsTable.gameId, gameId))
    .orderBy(desc(reviewsTable.createdAt));

  return c.json(reviews);
})

// Protected: specific user's review for a game
.get('/game/:gameId/user/:userId', getAuthUser, async (c) => {
  const gameId = c.req.param('gameId');
  const userId = c.req.param('userId');
  
  const reviews = await db
    .select()
    .from(reviewsTable)
    .where(and(
      eq(reviewsTable.gameId, gameId),
      eq(reviewsTable.userId, userId)
    ))
    .orderBy(desc(reviewsTable.createdAt));
  
  return c.json(reviews);
})

// Protected: all reviews by a user (includes game name/cover to avoid N+1 per review)
.get('/user/:userId', getAuthUser, async (c) => {
  const userId = c.req.param('userId');

  const reviews = await db
  .select({
    id: reviewsTable.id,
    userId: reviewsTable.userId,
    gameId: reviewsTable.gameId,
    rating: reviewsTable.rating,
    reviewText: reviewsTable.reviewText,
    createdAt: reviewsTable.createdAt,
    username: usersTable.username,
    displayName: usersTable.displayName,
    avatarUrl: usersTable.avatarUrl,
    gameName: gamesTable.name,
    gameCoverUrl: gamesTable.coverUrl,
  })
  .from(reviewsTable)
  .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
  .innerJoin(gamesTable, eq(reviewsTable.gameId, gamesTable.id))
  .where(eq(reviewsTable.userId, userId))
  .orderBy(desc(reviewsTable.createdAt))
  .limit(20); // Add pagination

  return c.json(reviews);
})
.post("/", zValidator("json", createReviewSchema), getAuthUser, async c => {
    const user = c.var.dbUser
    const review = await c.req.valid("json");
    const validatedReview = reviewsInsertSchema.parse({
        ...review,
        userId: user.id,
    })
    const result = await db
    .insert(reviewsTable)
    .values(validatedReview)
    .returning()
    .then(res => res[0]);
    c.status(201)
    return c.json(result);
})
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
