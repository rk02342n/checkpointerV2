import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { getAuthUser, kindeClient, sessionManager } from "../kinde"; // pass in getUser as middleware function to make the route authenticated
import { db } from "../db";
import { reviewsTable, reviewsInsertSchema, reviewsSelectSchema, createReviewSchema } from "../db/schema/reviews";
import { reviewLikesTable } from "../db/schema/review-likes";
import { eq, desc, sum, and, count, sql } from "drizzle-orm";
import { usersTable } from "../db/schema/users";
import { gamesTable } from "../db/schema/games";

import { createExpenseSchema } from "../sharedTypes";

export const reviewsRoute = new Hono()
// GET /reviews - Get all reviews (with optional filtering)
// Public endpoint for game reviews
// Public: all reviews for a game (with optional auth for userLiked)
.get('/game/:gameId', async (c) => {
  const gameId = c.req.param('gameId');

  // Try to get authenticated user (optional)
  let currentUserId: string | null = null;
  try {
    const manager = sessionManager(c);
    const isAuthenticated = await kindeClient.isAuthenticated(manager);
    if (isAuthenticated) {
      const kindeUser = await kindeClient.getUserProfile(manager);
      const dbUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.kindeId, kindeUser.id))
        .limit(1)
        .then(rows => rows[0]);
      if (dbUser) {
        currentUserId = dbUser.id;
      }
    }
  } catch {
    // User not authenticated, continue without user ID
  }

  // Subquery to count likes per review
  const likesSubquery = db
    .select({
      reviewId: reviewLikesTable.reviewId,
      likeCount: count().as('like_count'),
    })
    .from(reviewLikesTable)
    .groupBy(reviewLikesTable.reviewId)
    .as('likes_count');

  // Subquery to check if current user has liked each review
  const userLikesSubquery = currentUserId
    ? db
        .select({
          reviewId: reviewLikesTable.reviewId,
          userLiked: sql<boolean>`true`.as('user_liked'),
        })
        .from(reviewLikesTable)
        .where(eq(reviewLikesTable.userId, currentUserId))
        .as('user_likes')
    : null;

  // Build the query
  let query = db
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
      likeCount: sql<number>`COALESCE(${likesSubquery.likeCount}, 0)`.as('like_count'),
      userLiked: userLikesSubquery
        ? sql<boolean>`COALESCE(${userLikesSubquery.userLiked}, false)`.as('user_liked')
        : sql<boolean>`false`.as('user_liked'),
    })
    .from(reviewsTable)
    .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
    .leftJoin(likesSubquery, eq(reviewsTable.id, likesSubquery.reviewId));

  if (userLikesSubquery) {
    query = query.leftJoin(userLikesSubquery, eq(reviewsTable.id, userLikesSubquery.reviewId));
  }

  const reviews = await query
    .where(eq(reviewsTable.gameId, gameId))
    .orderBy(
      desc(sql`COALESCE(${likesSubquery.likeCount}, 0)`),
      sql`${reviewsTable.rating} ASC NULLS LAST`
    );

  return c.json(reviews);
})

// Toggle like on a review
.post('/:reviewId/like', getAuthUser, async (c) => {
  const reviewId = c.req.param('reviewId');
  const user = c.var.dbUser;

  // Check if review exists
  const review = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.id, reviewId))
    .then(res => res[0]);

  if (!review) {
    return c.json({ error: "Review not found" }, 404);
  }

  // Check if user has already liked this review
  const existingLike = await db
    .select()
    .from(reviewLikesTable)
    .where(and(
      eq(reviewLikesTable.userId, user.id),
      eq(reviewLikesTable.reviewId, reviewId)
    ))
    .then(res => res[0]);

  if (existingLike) {
    // Remove like
    await db
      .delete(reviewLikesTable)
      .where(and(
        eq(reviewLikesTable.userId, user.id),
        eq(reviewLikesTable.reviewId, reviewId)
      ));
    return c.json({ liked: false });
  } else {
    // Add like
    await db
      .insert(reviewLikesTable)
      .values({
        userId: user.id,
        reviewId: reviewId,
      });
    return c.json({ liked: true });
  }
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
  const currentUser = c.var.dbUser;
  const limit = Math.min(Number(c.req.query('limit')) || 10, 50);
  const offset = Number(c.req.query('offset')) || 0;

  // Subquery to count likes per review
  const likesSubquery = db
    .select({
      reviewId: reviewLikesTable.reviewId,
      likeCount: count().as('like_count'),
    })
    .from(reviewLikesTable)
    .groupBy(reviewLikesTable.reviewId)
    .as('likes_count');

  // Subquery to check if current user has liked each review
  const userLikesSubquery = db
    .select({
      reviewId: reviewLikesTable.reviewId,
      userLiked: sql<boolean>`true`.as('user_liked'),
    })
    .from(reviewLikesTable)
    .where(eq(reviewLikesTable.userId, currentUser.id))
    .as('user_likes');

  // Get total count and reviews in parallel
  const [countResult, reviews] = await Promise.all([
    db
      .select({ count: count() })
      .from(reviewsTable)
      .where(eq(reviewsTable.userId, userId))
      .then(res => res[0]?.count ?? 0),
    db
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
        likeCount: sql<number>`COALESCE(${likesSubquery.likeCount}, 0)`.as('like_count'),
        userLiked: sql<boolean>`COALESCE(${userLikesSubquery.userLiked}, false)`.as('user_liked'),
      })
      .from(reviewsTable)
      .innerJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .innerJoin(gamesTable, eq(reviewsTable.gameId, gamesTable.id))
      .leftJoin(likesSubquery, eq(reviewsTable.id, likesSubquery.reviewId))
      .leftJoin(userLikesSubquery, eq(reviewsTable.id, userLikesSubquery.reviewId))
      .where(eq(reviewsTable.userId, userId))
      .orderBy(desc(reviewsTable.createdAt))
      .limit(limit + 1)
      .offset(offset)
  ]);

  const hasMore = reviews.length > limit;
  const paginatedReviews = hasMore ? reviews.slice(0, limit) : reviews;

  return c.json({
    reviews: paginatedReviews,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    totalCount: countResult
  });
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
.delete("/:id", getAuthUser, async c => {
    const id = c.req.param('id');
    const user = c.var.dbUser;

    // First check if the review exists and belongs to the user
    const existingReview = await db
        .select()
        .from(reviewsTable)
        .where(eq(reviewsTable.id, id))
        .then(res => res[0]);

    if (!existingReview) {
        return c.json({ error: "Review not found" }, 404);
    }

    if (existingReview.userId !== user.id) {
        return c.json({ error: "You can only delete your own reviews" }, 403);
    }

    const deletedReview = await db
        .delete(reviewsTable)
        .where(eq(reviewsTable.id, id))
        .returning()
        .then(res => res[0]);

    return c.json({ review: deletedReview });
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
