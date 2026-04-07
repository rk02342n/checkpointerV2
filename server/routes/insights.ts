import { Hono } from "hono";
import { getAuthUser } from "../kinde";
import { db } from "../db";
import { sql, eq, and, desc, count, isNotNull } from "drizzle-orm";
import { gameSessionsTable } from "../db/schema/game-sessions";
import { reviewsTable } from "../db/schema/reviews";
import { reviewLikesTable } from "../db/schema/review-likes";
import { gameGenresTable } from "../db/schema/game-genres";
import { genresTable } from "../db/schema/genres";
import { userFollowsTable } from "../db/schema/user-follows";
import { gameListsTable } from "../db/schema/game-lists";
import { savedGameListsTable } from "../db/schema/saved-game-lists";
import { blogPostsTable } from "../db/schema/blog-posts";
import { wantToPlayTable } from "../db/schema/want-to-play";
import { gamesTable } from "../db/schema/games";

async function getGamingHabits(userId: string) {
  const [uniqueGames, statusCounts, monthlyActivity] = await Promise.all([
    // Total unique games played
    db
      .select({ count: sql<number>`count(distinct ${gameSessionsTable.gameId})` })
      .from(gameSessionsTable)
      .where(eq(gameSessionsTable.userId, userId))
      .then(res => Number(res[0]?.count ?? 0)),

    // Games finished vs stashed
    db
      .select({
        status: gameSessionsTable.status,
        count: count(),
      })
      .from(gameSessionsTable)
      .where(and(
        eq(gameSessionsTable.userId, userId),
        isNotNull(gameSessionsTable.status)
      ))
      .groupBy(gameSessionsTable.status),

    // Monthly activity (last 12 months)
    db
      .select({
        month: sql<string>`to_char(date_trunc('month', ${gameSessionsTable.startedAt}), 'YYYY-MM')`,
        count: count(),
      })
      .from(gameSessionsTable)
      .where(and(
        eq(gameSessionsTable.userId, userId),
        sql`${gameSessionsTable.startedAt} >= date_trunc('month', now()) - interval '11 months'`
      ))
      .groupBy(sql`date_trunc('month', ${gameSessionsTable.startedAt})`)
      .orderBy(sql`date_trunc('month', ${gameSessionsTable.startedAt})`),
  ]);

  const finished = statusCounts.find(s => s.status === "finished")?.count ?? 0;
  const stashed = statusCounts.find(s => s.status === "stashed")?.count ?? 0;
  const total = finished + stashed;
  const completionRate = total > 0 ? Math.round((finished / total) * 100) : 0;

  return {
    totalGamesPlayed: uniqueGames,
    gamesFinished: finished,
    gamesStashed: stashed,
    completionRate,
    monthlyActivity: monthlyActivity.map(m => ({
      month: m.month,
      count: m.count,
    })),
  };
}

async function getGenreBreakdown(userId: string) {
  const genres = await db
    .select({
      name: genresTable.name,
      count: sql<number>`count(distinct ${gameSessionsTable.gameId})`,
    })
    .from(gameSessionsTable)
    .innerJoin(gameGenresTable, eq(gameSessionsTable.gameId, gameGenresTable.gameId))
    .innerJoin(genresTable, eq(gameGenresTable.genreId, genresTable.id))
    .where(eq(gameSessionsTable.userId, userId))
    .groupBy(genresTable.name)
    .orderBy(desc(sql`count(distinct ${gameSessionsTable.gameId})`))
    .limit(10);

  const maxCount = genres.length > 0 ? Number(genres[0]!.count) : 1;

  return genres.map(g => ({
    name: g.name,
    count: Number(g.count),
    percentage: Math.round((Number(g.count) / maxCount) * 100),
  }));
}

async function getReviewStats(userId: string) {
  const [basicStats, ratingDistribution, totalLikes, mostLiked] = await Promise.all([
    // Total reviews + average rating
    db
      .select({
        totalReviews: count(),
        avgRating: sql<string | null>`avg(${reviewsTable.rating}::numeric)`,
      })
      .from(reviewsTable)
      .where(eq(reviewsTable.userId, userId))
      .then(res => res[0]),

    // Rating distribution (buckets 0-5)
    db
      .select({
        rating: sql<number>`floor(${reviewsTable.rating}::numeric)`,
        count: count(),
      })
      .from(reviewsTable)
      .where(and(
        eq(reviewsTable.userId, userId),
        isNotNull(reviewsTable.rating)
      ))
      .groupBy(sql`floor(${reviewsTable.rating}::numeric)`)
      .orderBy(sql`floor(${reviewsTable.rating}::numeric)`),

    // Total likes received across all reviews
    db
      .select({ count: count() })
      .from(reviewLikesTable)
      .innerJoin(reviewsTable, eq(reviewLikesTable.reviewId, reviewsTable.id))
      .where(eq(reviewsTable.userId, userId))
      .then(res => res[0]?.count ?? 0),

    // Most liked review
    db
      .select({
        id: reviewsTable.id,
        gameId: reviewsTable.gameId,
        gameName: gamesTable.name,
        rating: reviewsTable.rating,
        likeCount: sql<number>`count(${reviewLikesTable.reviewId})`,
      })
      .from(reviewsTable)
      .innerJoin(gamesTable, eq(reviewsTable.gameId, gamesTable.id))
      .leftJoin(reviewLikesTable, eq(reviewLikesTable.reviewId, reviewsTable.id))
      .where(eq(reviewsTable.userId, userId))
      .groupBy(reviewsTable.id, gamesTable.name, gamesTable.id)
      .orderBy(desc(sql`count(${reviewLikesTable.reviewId})`))
      .limit(1)
      .then(res => res[0] ?? null),
  ]);

  return {
    totalReviews: basicStats?.totalReviews ?? 0,
    avgRating: basicStats?.avgRating ? parseFloat(Number(basicStats.avgRating).toFixed(1)) : null,
    ratingDistribution: ratingDistribution.map(r => ({
      rating: Number(r.rating),
      count: r.count,
    })),
    totalLikesReceived: totalLikes,
    mostLikedReview: mostLiked && Number(mostLiked.likeCount) > 0
      ? {
          id: mostLiked.id,
          gameId: mostLiked.gameId,
          gameName: mostLiked.gameName,
          rating: mostLiked.rating,
          likeCount: Number(mostLiked.likeCount),
        }
      : null,
  };
}

async function getSocialInsights(userId: string) {
  const [followers, following, listsCreated, listsSavedByOthers, postsPublished, wishlistSize] = await Promise.all([
    db.select({ count: count() }).from(userFollowsTable).where(eq(userFollowsTable.followingId, userId)).then(r => r[0]?.count ?? 0),
    db.select({ count: count() }).from(userFollowsTable).where(eq(userFollowsTable.followerId, userId)).then(r => r[0]?.count ?? 0),
    db.select({ count: count() }).from(gameListsTable).where(eq(gameListsTable.userId, userId)).then(r => r[0]?.count ?? 0),
    db
      .select({ count: count() })
      .from(savedGameListsTable)
      .innerJoin(gameListsTable, eq(savedGameListsTable.listId, gameListsTable.id))
      .where(eq(gameListsTable.userId, userId))
      .then(r => r[0]?.count ?? 0),
    db.select({ count: count() }).from(blogPostsTable).where(and(eq(blogPostsTable.userId, userId), eq(blogPostsTable.status, "published"))).then(r => r[0]?.count ?? 0),
    db.select({ count: count() }).from(wantToPlayTable).where(eq(wantToPlayTable.userId, userId)).then(r => r[0]?.count ?? 0),
  ]);

  return {
    followerCount: followers,
    followingCount: following,
    listsCreated,
    listsSavedByOthers,
    blogPostsPublished: postsPublished,
    wishlistSize,
  };
}

export const insightsRoute = new Hono()
  .get("/", getAuthUser, async (c) => {
    const dbUser = c.var.dbUser;

    const [gaming, genres, reviews, social] = await Promise.all([
      getGamingHabits(dbUser.id),
      getGenreBreakdown(dbUser.id),
      getReviewStats(dbUser.id),
      getSocialInsights(dbUser.id),
    ]);

    return c.json({ gaming, genres, reviews, social });
  });
