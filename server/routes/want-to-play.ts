import { Hono } from "hono";
import { getAuthUser, kindeClient, sessionManager } from "../kinde";
import { db } from "../db";
import { wantToPlayTable } from "../db/schema/want-to-play";
import { gamesTable } from "../db/schema/games";
import { usersTable } from "../db/schema/users";
import { eq, and, desc, count } from "drizzle-orm";

export const wantToPlayRoute = new Hono()

// GET / - Get own wishlist with game details (authenticated)
.get('/', getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const [totalCountResult, wishlist] = await Promise.all([
    db
      .select({ count: count() })
      .from(wantToPlayTable)
      .where(eq(wantToPlayTable.userId, user.id))
      .then(res => res[0]?.count ?? 0),
    db
      .select({
        gameId: wantToPlayTable.gameId,
        createdAt: wantToPlayTable.createdAt,
        gameName: gamesTable.name,
        gameCoverUrl: gamesTable.coverUrl,
        gameSlug: gamesTable.slug,
      })
      .from(wantToPlayTable)
      .innerJoin(gamesTable, eq(wantToPlayTable.gameId, gamesTable.id))
      .where(eq(wantToPlayTable.userId, user.id))
      .orderBy(desc(wantToPlayTable.createdAt))
      .limit(limit + 1)
      .offset(offset),
  ]);

  const hasMore = wishlist.length > limit;
  const paginatedWishlist = hasMore ? wishlist.slice(0, limit) : wishlist;

  return c.json({
    wishlist: paginatedWishlist,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    totalCount: totalCountResult,
  });
})

// GET /check/:gameId - Check if game is in wishlist (authenticated)
.get('/check/:gameId', getAuthUser, async (c) => {
  const gameId = c.req.param('gameId');
  const user = c.var.dbUser;

  const existing = await db
    .select()
    .from(wantToPlayTable)
    .where(and(
      eq(wantToPlayTable.userId, user.id),
      eq(wantToPlayTable.gameId, gameId)
    ))
    .limit(1);

  return c.json({ inWishlist: existing.length > 0 });
})

// GET /user/:userId - Get user's public wishlist
.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const [totalCountResult, wishlist] = await Promise.all([
    db
      .select({ count: count() })
      .from(wantToPlayTable)
      .where(eq(wantToPlayTable.userId, userId))
      .then(res => res[0]?.count ?? 0),
    db
      .select({
        gameId: wantToPlayTable.gameId,
        createdAt: wantToPlayTable.createdAt,
        gameName: gamesTable.name,
        gameCoverUrl: gamesTable.coverUrl,
        gameSlug: gamesTable.slug,
      })
      .from(wantToPlayTable)
      .innerJoin(gamesTable, eq(wantToPlayTable.gameId, gamesTable.id))
      .where(eq(wantToPlayTable.userId, userId))
      .orderBy(desc(wantToPlayTable.createdAt))
      .limit(limit + 1)
      .offset(offset),
  ]);

  const hasMore = wishlist.length > limit;
  const paginatedWishlist = hasMore ? wishlist.slice(0, limit) : wishlist;

  return c.json({
    wishlist: paginatedWishlist,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    totalCount: totalCountResult,
  });
})

// GET /game/:gameId/count - Get count of users who want to play (public)
.get('/game/:gameId/count', async (c) => {
  const gameId = c.req.param('gameId');

  const result = await db
    .select({ count: count() })
    .from(wantToPlayTable)
    .where(eq(wantToPlayTable.gameId, gameId))
    .then(res => res[0]);

  return c.json({ count: result?.count ?? 0 });
})

// POST /:gameId - Add game to wishlist (authenticated)
.post('/:gameId', getAuthUser, async (c) => {
  const gameId = c.req.param('gameId');
  const user = c.var.dbUser;

  // Check if game exists
  const game = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, gameId))
    .limit(1)
    .then(res => res[0]);

  if (!game) {
    return c.json({ error: "Game not found" }, 404);
  }

  // Check if already in wishlist
  const existing = await db
    .select()
    .from(wantToPlayTable)
    .where(and(
      eq(wantToPlayTable.userId, user.id),
      eq(wantToPlayTable.gameId, gameId)
    ))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "Game already in wishlist" }, 409);
  }

  // Add to wishlist
  await db.insert(wantToPlayTable).values({
    userId: user.id,
    gameId: gameId,
  });

  return c.json({ added: true });
})

// DELETE /:gameId - Remove game from wishlist (authenticated)
.delete('/:gameId', getAuthUser, async (c) => {
  const gameId = c.req.param('gameId');
  const user = c.var.dbUser;

  const deleted = await db
    .delete(wantToPlayTable)
    .where(and(
      eq(wantToPlayTable.userId, user.id),
      eq(wantToPlayTable.gameId, gameId)
    ))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Game not in wishlist" }, 404);
  }

  return c.json({ removed: true });
});
