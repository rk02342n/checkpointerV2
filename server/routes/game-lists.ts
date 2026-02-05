import { Hono } from "hono";
import { getAuthUser } from "../kinde";
import { db } from "../db";
import { gameListsTable } from "../db/schema/game-lists";
import { gameListItemsTable } from "../db/schema/game-list-items";
import { gamesTable } from "../db/schema/games";
import { usersTable } from "../db/schema/users";
import { eq, and, desc, asc, count, sql, or } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";

const LIST_LIMITS = {
  free: 10,
  pro: 50,
  admin: 50,
} as const;

const createListSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]).default("public"),
});

const updateListSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  visibility: z.enum(["public", "private"]).optional(),
});

const reorderSchema = z.object({
  gameIds: z.array(z.string().uuid()),
});

export const gameListsRoute = new Hono()

// GET / - Get own lists with game counts (authenticated)
.get('/', getAuthUser, async (c) => {
  const user = c.var.dbUser;

  const lists = await db
    .select({
      id: gameListsTable.id,
      name: gameListsTable.name,
      description: gameListsTable.description,
      visibility: gameListsTable.visibility,
      createdAt: gameListsTable.createdAt,
      updatedAt: gameListsTable.updatedAt,
      gameCount: count(gameListItemsTable.gameId),
    })
    .from(gameListsTable)
    .leftJoin(gameListItemsTable, eq(gameListsTable.id, gameListItemsTable.listId))
    .where(eq(gameListsTable.userId, user.id))
    .groupBy(gameListsTable.id)
    .orderBy(desc(gameListsTable.updatedAt));

  // Get first 4 game covers for each list
  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const covers = await db
        .select({
          coverUrl: gamesTable.coverUrl,
        })
        .from(gameListItemsTable)
        .innerJoin(gamesTable, eq(gameListItemsTable.gameId, gamesTable.id))
        .where(eq(gameListItemsTable.listId, list.id))
        .orderBy(asc(gameListItemsTable.position))
        .limit(4);

      return {
        ...list,
        coverUrls: covers.map(c => c.coverUrl).filter(Boolean),
      };
    })
  );

  return c.json({ lists: listsWithCovers });
})

// GET /user/:userId - Get user's public lists
.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');

  const lists = await db
    .select({
      id: gameListsTable.id,
      name: gameListsTable.name,
      description: gameListsTable.description,
      visibility: gameListsTable.visibility,
      createdAt: gameListsTable.createdAt,
      updatedAt: gameListsTable.updatedAt,
      gameCount: count(gameListItemsTable.gameId),
    })
    .from(gameListsTable)
    .leftJoin(gameListItemsTable, eq(gameListsTable.id, gameListItemsTable.listId))
    .where(and(
      eq(gameListsTable.userId, userId),
      eq(gameListsTable.visibility, 'public')
    ))
    .groupBy(gameListsTable.id)
    .orderBy(desc(gameListsTable.updatedAt));

  // Get first 4 game covers for each list
  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      const covers = await db
        .select({
          coverUrl: gamesTable.coverUrl,
        })
        .from(gameListItemsTable)
        .innerJoin(gamesTable, eq(gameListItemsTable.gameId, gamesTable.id))
        .where(eq(gameListItemsTable.listId, list.id))
        .orderBy(asc(gameListItemsTable.position))
        .limit(4);

      return {
        ...list,
        coverUrls: covers.map(c => c.coverUrl).filter(Boolean),
      };
    })
  );

  return c.json({ lists: listsWithCovers });
})

// GET /:listId - Get single list with games (public lists visible to all, private only to owner)
.get('/:listId', async (c) => {
  const listId = c.req.param('listId');

  // Try to get authenticated user (optional)
  let currentUserId: string | null = null;
  try {
    const authHeader = c.req.header('Authorization');
    if (authHeader) {
      // Use a simpler approach - just query for the list and check visibility after
    }
  } catch {}

  // Get the list
  const list = await db
    .select({
      id: gameListsTable.id,
      userId: gameListsTable.userId,
      name: gameListsTable.name,
      description: gameListsTable.description,
      visibility: gameListsTable.visibility,
      createdAt: gameListsTable.createdAt,
      updatedAt: gameListsTable.updatedAt,
      ownerUsername: usersTable.username,
      ownerDisplayName: usersTable.displayName,
      ownerAvatarUrl: usersTable.avatarUrl,
    })
    .from(gameListsTable)
    .innerJoin(usersTable, eq(gameListsTable.userId, usersTable.id))
    .where(eq(gameListsTable.id, listId))
    .limit(1)
    .then(res => res[0]);

  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  // For now, only allow public lists (auth check will be added by middleware)
  // Private lists require authentication which we'll handle at the route level
  if (list.visibility === 'private') {
    return c.json({ error: "List not found" }, 404);
  }

  // Get games in the list
  const games = await db
    .select({
      gameId: gameListItemsTable.gameId,
      position: gameListItemsTable.position,
      addedAt: gameListItemsTable.createdAt,
      gameName: gamesTable.name,
      gameCoverUrl: gamesTable.coverUrl,
      gameSlug: gamesTable.slug,
      gameReleaseDate: gamesTable.releaseDate,
    })
    .from(gameListItemsTable)
    .innerJoin(gamesTable, eq(gameListItemsTable.gameId, gamesTable.id))
    .where(eq(gameListItemsTable.listId, listId))
    .orderBy(asc(gameListItemsTable.position));

  return c.json({
    list: {
      ...list,
      games,
      gameCount: games.length,
    }
  });
})

// GET /:listId/auth - Get single list (authenticated, allows private list access for owner)
.get('/:listId/auth', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
  const user = c.var.dbUser;

  // Get the list
  const list = await db
    .select({
      id: gameListsTable.id,
      userId: gameListsTable.userId,
      name: gameListsTable.name,
      description: gameListsTable.description,
      visibility: gameListsTable.visibility,
      createdAt: gameListsTable.createdAt,
      updatedAt: gameListsTable.updatedAt,
      ownerUsername: usersTable.username,
      ownerDisplayName: usersTable.displayName,
      ownerAvatarUrl: usersTable.avatarUrl,
    })
    .from(gameListsTable)
    .innerJoin(usersTable, eq(gameListsTable.userId, usersTable.id))
    .where(eq(gameListsTable.id, listId))
    .limit(1)
    .then(res => res[0]);

  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  // Private lists only visible to owner
  if (list.visibility === 'private' && list.userId !== user.id) {
    return c.json({ error: "List not found" }, 404);
  }

  // Get games in the list
  const games = await db
    .select({
      gameId: gameListItemsTable.gameId,
      position: gameListItemsTable.position,
      addedAt: gameListItemsTable.createdAt,
      gameName: gamesTable.name,
      gameCoverUrl: gamesTable.coverUrl,
      gameSlug: gamesTable.slug,
      gameReleaseDate: gamesTable.releaseDate,
    })
    .from(gameListItemsTable)
    .innerJoin(gamesTable, eq(gameListItemsTable.gameId, gamesTable.id))
    .where(eq(gameListItemsTable.listId, listId))
    .orderBy(asc(gameListItemsTable.position));

  return c.json({
    list: {
      ...list,
      games,
      gameCount: games.length,
      isOwner: list.userId === user.id,
    }
  });
})

// POST / - Create new list (authenticated)
.post('/', getAuthUser, zValidator('json', createListSchema), async (c) => {
  const user = c.var.dbUser;
  const data = c.req.valid('json');

  // Check list limit based on user role
  const limit = LIST_LIMITS[user.role as keyof typeof LIST_LIMITS] || LIST_LIMITS.free;

  const existingCount = await db
    .select({ count: count() })
    .from(gameListsTable)
    .where(eq(gameListsTable.userId, user.id))
    .then(res => res[0]?.count ?? 0);

  if (existingCount >= limit) {
    return c.json({
      error: `You've reached the maximum number of lists (${limit}). ${user.role === 'free' ? 'Upgrade to Pro for more lists.' : ''}`
    }, 400);
  }

  // Create the list
  const newList = await db
    .insert(gameListsTable)
    .values({
      userId: user.id,
      name: data.name,
      description: data.description,
      visibility: data.visibility,
    })
    .returning();

  return c.json({ list: newList[0] }, 201);
})

// PATCH /:listId - Update list (authenticated, owner only)
.patch('/:listId', getAuthUser, zValidator('json', updateListSchema), async (c) => {
  const listId = c.req.param('listId');
  const user = c.var.dbUser;
  const data = c.req.valid('json');

  // Check ownership
  const list = await db
    .select()
    .from(gameListsTable)
    .where(and(
      eq(gameListsTable.id, listId),
      eq(gameListsTable.userId, user.id)
    ))
    .limit(1)
    .then(res => res[0]);

  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  // Update the list
  const updated = await db
    .update(gameListsTable)
    .set({
      ...data,
      updatedAt: new Date(),
    })
    .where(eq(gameListsTable.id, listId))
    .returning();

  return c.json({ list: updated[0] });
})

// DELETE /:listId - Delete list (authenticated, owner only)
.delete('/:listId', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
  const user = c.var.dbUser;

  const deleted = await db
    .delete(gameListsTable)
    .where(and(
      eq(gameListsTable.id, listId),
      eq(gameListsTable.userId, user.id)
    ))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "List not found" }, 404);
  }

  return c.json({ deleted: true });
})

// POST /:listId/games/:gameId - Add game to list (authenticated, owner only)
.post('/:listId/games/:gameId', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
  const gameId = c.req.param('gameId');
  const user = c.var.dbUser;

  // Check ownership
  const list = await db
    .select()
    .from(gameListsTable)
    .where(and(
      eq(gameListsTable.id, listId),
      eq(gameListsTable.userId, user.id)
    ))
    .limit(1)
    .then(res => res[0]);

  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

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

  // Check if already in list
  const existing = await db
    .select()
    .from(gameListItemsTable)
    .where(and(
      eq(gameListItemsTable.listId, listId),
      eq(gameListItemsTable.gameId, gameId)
    ))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "Game already in list" }, 409);
  }

  // Get the highest position in the list
  const maxPosition = await db
    .select({ max: sql<number>`COALESCE(MAX(${gameListItemsTable.position}), -1)` })
    .from(gameListItemsTable)
    .where(eq(gameListItemsTable.listId, listId))
    .then(res => res[0]?.max ?? -1);

  // Add to list
  await db.insert(gameListItemsTable).values({
    listId,
    gameId,
    position: maxPosition + 1,
  });

  // Update list's updatedAt
  await db
    .update(gameListsTable)
    .set({ updatedAt: new Date() })
    .where(eq(gameListsTable.id, listId));

  return c.json({ added: true });
})

// DELETE /:listId/games/:gameId - Remove game from list (authenticated, owner only)
.delete('/:listId/games/:gameId', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
  const gameId = c.req.param('gameId');
  const user = c.var.dbUser;

  // Check ownership
  const list = await db
    .select()
    .from(gameListsTable)
    .where(and(
      eq(gameListsTable.id, listId),
      eq(gameListsTable.userId, user.id)
    ))
    .limit(1)
    .then(res => res[0]);

  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  const deleted = await db
    .delete(gameListItemsTable)
    .where(and(
      eq(gameListItemsTable.listId, listId),
      eq(gameListItemsTable.gameId, gameId)
    ))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Game not in list" }, 404);
  }

  // Update list's updatedAt
  await db
    .update(gameListsTable)
    .set({ updatedAt: new Date() })
    .where(eq(gameListsTable.id, listId));

  return c.json({ removed: true });
})

// PATCH /:listId/reorder - Reorder games in list (authenticated, owner only)
.patch('/:listId/reorder', getAuthUser, zValidator('json', reorderSchema), async (c) => {
  const listId = c.req.param('listId');
  const user = c.var.dbUser;
  const { gameIds } = c.req.valid('json');

  // Check ownership
  const list = await db
    .select()
    .from(gameListsTable)
    .where(and(
      eq(gameListsTable.id, listId),
      eq(gameListsTable.userId, user.id)
    ))
    .limit(1)
    .then(res => res[0]);

  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  // Update positions
  await Promise.all(
    gameIds.map((gameId, index) =>
      db
        .update(gameListItemsTable)
        .set({ position: index })
        .where(and(
          eq(gameListItemsTable.listId, listId),
          eq(gameListItemsTable.gameId, gameId)
        ))
    )
  );

  // Update list's updatedAt
  await db
    .update(gameListsTable)
    .set({ updatedAt: new Date() })
    .where(eq(gameListsTable.id, listId));

  return c.json({ reordered: true });
})

// GET /game/:gameId/lists - Get own lists with game inclusion status (authenticated)
.get('/game/:gameId/lists', getAuthUser, async (c) => {
  const gameId = c.req.param('gameId');
  const user = c.var.dbUser;

  // Get all user's lists with whether the game is in each
  const lists = await db
    .select({
      id: gameListsTable.id,
      name: gameListsTable.name,
      visibility: gameListsTable.visibility,
      gameCount: count(gameListItemsTable.gameId),
    })
    .from(gameListsTable)
    .leftJoin(gameListItemsTable, eq(gameListsTable.id, gameListItemsTable.listId))
    .where(eq(gameListsTable.userId, user.id))
    .groupBy(gameListsTable.id)
    .orderBy(desc(gameListsTable.updatedAt));

  // Check which lists contain this game
  const listsWithGame = await db
    .select({ listId: gameListItemsTable.listId })
    .from(gameListItemsTable)
    .where(eq(gameListItemsTable.gameId, gameId));

  const gameListIds = new Set(listsWithGame.map(l => l.listId));

  const listsWithStatus = lists.map(list => ({
    ...list,
    hasGame: gameListIds.has(list.id),
  }));

  return c.json({ lists: listsWithStatus });
});
