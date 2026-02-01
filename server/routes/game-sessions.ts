import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { getAuthUser } from "../kinde";
import { db } from "../db";
import { gameSessionsTable } from "../db/schema/game-sessions";
import { gamesTable } from "../db/schema/games";
import { eq, and, isNull, desc, count } from "drizzle-orm";

const setCurrentlyPlayingSchema = z.object({
  gameId: z.string().uuid()
});

const stopPlayingSchema = z.object({
  status: z.enum(["finished", "stashed"]).optional()
});

export const gameSessionsRoute = new Hono()
// POST /current - Set currently playing game (ends previous session if any)
.post('/current', zValidator("json", setCurrentlyPlayingSchema), getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const { gameId } = await c.req.valid("json");

  // Verify game exists
  const game = await db
    .select()
    .from(gamesTable)
    .where(eq(gamesTable.id, gameId))
    .then(res => res[0]);

  if (!game) {
    return c.json({ error: "Game not found" }, 404);
  }

  // End any existing active session
  await db
    .update(gameSessionsTable)
    .set({ endedAt: new Date() })
    .where(and(
      eq(gameSessionsTable.userId, user.id),
      isNull(gameSessionsTable.endedAt)
    ));

  // Create new session
  const newSession = await db
    .insert(gameSessionsTable)
    .values({
      userId: user.id,
      gameId: gameId,
    })
    .returning()
    .then(res => res[0]);

  return c.json({
    session: newSession,
    game: {
      id: game.id,
      name: game.name,
      coverUrl: game.coverUrl,
    }
  }, 201);
})

// DELETE /current - Stop playing (end current session)
.delete('/current', zValidator("json", stopPlayingSchema), getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const { status } = await c.req.valid("json");

  // End the active session
  const endedSession = await db
    .update(gameSessionsTable)
    .set({
      endedAt: new Date(),
      status: status ?? null
    })
    .where(and(
      eq(gameSessionsTable.userId, user.id),
      isNull(gameSessionsTable.endedAt)
    ))
    .returning()
    .then(res => res[0]);

  if (!endedSession) {
    return c.json({ error: "No active session" }, 404);
  }

  return c.json({ session: endedSession });
})

// GET /current - Get own currently playing
.get('/current', getAuthUser, async (c) => {
  const user = c.var.dbUser;

  const session = await db
    .select({
      session: gameSessionsTable,
      game: {
        id: gamesTable.id,
        name: gamesTable.name,
        coverUrl: gamesTable.coverUrl,
      }
    })
    .from(gameSessionsTable)
    .innerJoin(gamesTable, eq(gameSessionsTable.gameId, gamesTable.id))
    .where(and(
      eq(gameSessionsTable.userId, user.id),
      isNull(gameSessionsTable.endedAt)
    ))
    .then(res => res[0]);

  if (!session) {
    return c.json({ session: null, game: null });
  }

  return c.json(session);
})

// GET /user/:userId - Get any user's currently playing (public)
.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');

  const session = await db
    .select({
      session: gameSessionsTable,
      game: {
        id: gamesTable.id,
        name: gamesTable.name,
        coverUrl: gamesTable.coverUrl,
      }
    })
    .from(gameSessionsTable)
    .innerJoin(gamesTable, eq(gameSessionsTable.gameId, gamesTable.id))
    .where(and(
      eq(gameSessionsTable.userId, userId),
      isNull(gameSessionsTable.endedAt)
    ))
    .then(res => res[0]);

  if (!session) {
    return c.json({ session: null, game: null });
  }

  return c.json(session);
})

// GET /game/:gameId/active-players - Get count of users currently playing a game
.get('/game/:gameId/active-players', async (c) => {
  const gameId = c.req.param('gameId');

  const result = await db
    .select({ count: count() })
    .from(gameSessionsTable)
    .where(and(
      eq(gameSessionsTable.gameId, gameId),
      isNull(gameSessionsTable.endedAt)
    ))
    .then(res => res[0]);

  return c.json({ count: result?.count ?? 0 });
})

// GET /user/:userId/history - Get user's play history
.get('/user/:userId/history', async (c) => {
  const userId = c.req.param('userId');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const sessions = await db
    .select({
      session: gameSessionsTable,
      game: {
        id: gamesTable.id,
        name: gamesTable.name,
        coverUrl: gamesTable.coverUrl,
      }
    })
    .from(gameSessionsTable)
    .innerJoin(gamesTable, eq(gameSessionsTable.gameId, gamesTable.id))
    .where(eq(gameSessionsTable.userId, userId))
    .orderBy(desc(gameSessionsTable.startedAt))
    .limit(limit + 1)
    .offset(offset);

  const hasMore = sessions.length > limit;
  const paginatedSessions = hasMore ? sessions.slice(0, limit) : sessions;

  return c.json({
    sessions: paginatedSessions,
    hasMore,
    nextOffset: hasMore ? offset + limit : null
  });
});
