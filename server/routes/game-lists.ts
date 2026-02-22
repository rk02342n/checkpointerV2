import { Hono } from "hono";
import { getAuthUser } from "../kinde";
import { db } from "../db";
import { gameListsTable } from "../db/schema/game-lists";
import { gameListItemsTable } from "../db/schema/game-list-items";
import { gamesTable } from "../db/schema/games";
import { usersTable } from "../db/schema/users";
import { savedGameListsTable } from "../db/schema/saved-game-lists";
import { eq, and, desc, asc, count, sql, or } from "drizzle-orm";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { s3Client, R2_BUCKET, PutObjectCommand, GetObjectCommand } from "../s3";

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
  gameIds: z.array(z.uuid()),
});

export const gameListsRoute = new Hono()

// GET / - Get own lists with game counts (authenticated)
.get('/', getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const [totalCountResult, lists] = await Promise.all([
    db
      .select({ count: count() })
      .from(gameListsTable)
      .where(eq(gameListsTable.userId, user.id))
      .then(res => res[0]?.count ?? 0),
    db
      .select({
        id: gameListsTable.id,
        name: gameListsTable.name,
        description: gameListsTable.description,
        coverUrl: gameListsTable.coverUrl,
        visibility: gameListsTable.visibility,
        createdAt: gameListsTable.createdAt,
        updatedAt: gameListsTable.updatedAt,
        gameCount: count(gameListItemsTable.gameId),
      })
      .from(gameListsTable)
      .leftJoin(gameListItemsTable, eq(gameListsTable.id, gameListItemsTable.listId))
      .where(eq(gameListsTable.userId, user.id))
      .groupBy(gameListsTable.id)
      .orderBy(desc(gameListsTable.updatedAt))
      .limit(limit + 1)
      .offset(offset),
  ]);

  const hasMore = lists.length > limit;
  const paginatedLists = hasMore ? lists.slice(0, limit) : lists;

  // Get first 4 game covers for each list (only if no custom cover)
  const listsWithCovers = await Promise.all(
    paginatedLists.map(async (list) => {
      // If list has custom cover, don't fetch game covers
      if (list.coverUrl) {
        return {
          ...list,
          gameCoverUrls: [],
        };
      }

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
        gameCoverUrls: covers.map(c => c.coverUrl).filter(Boolean),
      };
    })
  );

  return c.json({
    lists: listsWithCovers,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    totalCount: totalCountResult,
  });
})

// GET /saved - Get user's saved lists (authenticated)
.get('/saved', getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const [totalCountResult, savedLists] = await Promise.all([
    db
      .select({ count: count() })
      .from(savedGameListsTable)
      .innerJoin(gameListsTable, eq(savedGameListsTable.listId, gameListsTable.id))
      .where(and(
        eq(savedGameListsTable.userId, user.id),
        eq(gameListsTable.visibility, 'public')
      ))
      .then(res => res[0]?.count ?? 0),
    db
      .select({
        id: gameListsTable.id,
        name: gameListsTable.name,
        description: gameListsTable.description,
        coverUrl: gameListsTable.coverUrl,
        visibility: gameListsTable.visibility,
        createdAt: gameListsTable.createdAt,
        updatedAt: gameListsTable.updatedAt,
        gameCount: count(gameListItemsTable.gameId),
        ownerUsername: usersTable.username,
        ownerDisplayName: usersTable.displayName,
        ownerAvatarUrl: usersTable.avatarUrl,
        ownerId: usersTable.id,
      })
      .from(savedGameListsTable)
      .innerJoin(gameListsTable, eq(savedGameListsTable.listId, gameListsTable.id))
      .innerJoin(usersTable, eq(gameListsTable.userId, usersTable.id))
      .leftJoin(gameListItemsTable, eq(gameListsTable.id, gameListItemsTable.listId))
      .where(and(
        eq(savedGameListsTable.userId, user.id),
        eq(gameListsTable.visibility, 'public')
      ))
      .groupBy(gameListsTable.id, usersTable.id, savedGameListsTable.createdAt)
      .orderBy(desc(savedGameListsTable.createdAt))
      .limit(limit + 1)
      .offset(offset),
  ]);

  const hasMore = savedLists.length > limit;
  const paginatedLists = hasMore ? savedLists.slice(0, limit) : savedLists;

  // Get first 4 game covers for each list (only if no custom cover)
  const listsWithCovers = await Promise.all(
    paginatedLists.map(async (list) => {
      if (list.coverUrl) {
        return {
          ...list,
          gameCoverUrls: [],
        };
      }

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
        gameCoverUrls: covers.map(c => c.coverUrl).filter(Boolean),
      };
    })
  );

  return c.json({
    lists: listsWithCovers,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    totalCount: totalCountResult,
  });
})

// GET /user/:userId - Get user's public lists
.get('/user/:userId', async (c) => {
  const userId = c.req.param('userId');
  const limit = Math.min(Number(c.req.query('limit')) || 20, 50);
  const offset = Number(c.req.query('offset')) || 0;

  const [totalCountResult, lists] = await Promise.all([
    db
      .select({ count: count() })
      .from(gameListsTable)
      .where(and(
        eq(gameListsTable.userId, userId),
        eq(gameListsTable.visibility, 'public')
      ))
      .then(res => res[0]?.count ?? 0),
    db
      .select({
        id: gameListsTable.id,
        name: gameListsTable.name,
        description: gameListsTable.description,
        coverUrl: gameListsTable.coverUrl,
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
      .orderBy(desc(gameListsTable.updatedAt))
      .limit(limit + 1)
      .offset(offset),
  ]);

  const hasMore = lists.length > limit;
  const paginatedLists = hasMore ? lists.slice(0, limit) : lists;

  // Get first 4 game covers for each list (only if no custom cover)
  const listsWithCovers = await Promise.all(
    paginatedLists.map(async (list) => {
      if (list.coverUrl) {
        return {
          ...list,
          gameCoverUrls: [],
        };
      }

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
        gameCoverUrls: covers.map(c => c.coverUrl).filter(Boolean),
      };
    })
  );

  return c.json({
    lists: listsWithCovers,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    totalCount: totalCountResult,
  });
})

// GET /popular - Get popular public lists ordered by save count
.get('/popular', async (c) => {
  const limitParam = Number(c.req.query('limit')) || 6;
  const limit = Math.min(Math.max(limitParam, 1), 20);

  const lists = await db
    .select({
      id: gameListsTable.id,
      name: gameListsTable.name,
      description: gameListsTable.description,
      coverUrl: gameListsTable.coverUrl,
      visibility: gameListsTable.visibility,
      createdAt: gameListsTable.createdAt,
      updatedAt: gameListsTable.updatedAt,
      gameCount: sql<number>`(SELECT COUNT(*) FROM game_list_items WHERE game_list_items.list_id = ${gameListsTable.id})`.as('gameCount'),
      saveCount: sql<number>`(SELECT COUNT(*) FROM saved_game_lists WHERE saved_game_lists.list_id = ${gameListsTable.id})`.as('saveCount'),
      ownerUsername: usersTable.username,
      ownerDisplayName: usersTable.displayName,
      ownerAvatarUrl: usersTable.avatarUrl,
      ownerId: usersTable.id,
    })
    .from(gameListsTable)
    .innerJoin(usersTable, eq(gameListsTable.userId, usersTable.id))
    .where(and(
      eq(gameListsTable.visibility, 'public'),
      sql`${gameListsTable.coverUrl} IS NOT NULL`
    ))
    .orderBy(
      desc(sql`(SELECT COUNT(*) FROM saved_game_lists WHERE saved_game_lists.list_id = ${gameListsTable.id})`),
      desc(gameListsTable.updatedAt)
    )
    .limit(limit);

  // Get first 4 game covers for each list (only if no custom cover)
  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      if (list.coverUrl) {
        return { ...list, gameCoverUrls: [] };
      }

      const covers = await db
        .select({ coverUrl: gamesTable.coverUrl })
        .from(gameListItemsTable)
        .innerJoin(gamesTable, eq(gameListItemsTable.gameId, gamesTable.id))
        .where(eq(gameListItemsTable.listId, list.id))
        .orderBy(asc(gameListItemsTable.position))
        .limit(4);

      return {
        ...list,
        gameCoverUrls: covers.map(c => c.coverUrl).filter(Boolean),
      };
    })
  );

  return c.json({ lists: listsWithCovers });
})

// GET /game/:gameId/public-lists - Get public lists that contain a specific game
.get('/game/:gameId/public-lists', async (c) => {
  const gameId = c.req.param('gameId');
  const limitParam = Number(c.req.query('limit')) || 4;
  const limit = Math.min(Math.max(limitParam, 1), 20);

  // Get total count of public lists containing this game
  const totalCountResult = await db
    .select({ count: count() })
    .from(gameListItemsTable)
    .innerJoin(gameListsTable, eq(gameListItemsTable.listId, gameListsTable.id))
    .where(and(
      eq(gameListItemsTable.gameId, gameId),
      eq(gameListsTable.visibility, 'public')
    ))
    .then(res => res[0]?.count ?? 0);

  const lists = await db
    .select({
      id: gameListsTable.id,
      name: gameListsTable.name,
      description: gameListsTable.description,
      coverUrl: gameListsTable.coverUrl,
      visibility: gameListsTable.visibility,
      createdAt: gameListsTable.createdAt,
      updatedAt: gameListsTable.updatedAt,
      gameCount: sql<number>`(SELECT COUNT(*) FROM game_list_items WHERE game_list_items.list_id = ${gameListsTable.id})`.as('gameCount'),
      saveCount: sql<number>`(SELECT COUNT(*) FROM saved_game_lists WHERE saved_game_lists.list_id = ${gameListsTable.id})`.as('saveCount'),
      ownerUsername: usersTable.username,
      ownerDisplayName: usersTable.displayName,
      ownerAvatarUrl: usersTable.avatarUrl,
      ownerId: usersTable.id,
    })
    .from(gameListItemsTable)
    .innerJoin(gameListsTable, eq(gameListItemsTable.listId, gameListsTable.id))
    .innerJoin(usersTable, eq(gameListsTable.userId, usersTable.id))
    .where(and(
      eq(gameListItemsTable.gameId, gameId),
      eq(gameListsTable.visibility, 'public')
    ))
    .orderBy(
      desc(sql`(SELECT COUNT(*) FROM saved_game_lists WHERE saved_game_lists.list_id = ${gameListsTable.id})`),
      desc(gameListsTable.updatedAt)
    )
    .limit(limit);

  // Get first 4 game covers for each list (only if no custom cover)
  const listsWithCovers = await Promise.all(
    lists.map(async (list) => {
      if (list.coverUrl) {
        return { ...list, gameCoverUrls: [] };
      }

      const covers = await db
        .select({ coverUrl: gamesTable.coverUrl })
        .from(gameListItemsTable)
        .innerJoin(gamesTable, eq(gameListItemsTable.gameId, gamesTable.id))
        .where(eq(gameListItemsTable.listId, list.id))
        .orderBy(asc(gameListItemsTable.position))
        .limit(4);

      return {
        ...list,
        gameCoverUrls: covers.map(c => c.coverUrl).filter(Boolean),
      };
    })
  );

  return c.json({ lists: listsWithCovers, totalCount: totalCountResult });
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
      coverUrl: gameListsTable.coverUrl,
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
      coverUrl: gameListsTable.coverUrl,
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
})

// POST /:listId/cover - Upload cover image for list (authenticated, owner only)
.post('/:listId/cover', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
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

  const formData = await c.req.formData();
  const fileEntry = formData.get("cover");

  if (!fileEntry || typeof fileEntry === "string") {
    return c.json({ error: "No file provided" }, 400);
  }

  const file = fileEntry as File;

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
  if (!allowedTypes.includes(file.type)) {
    return c.json({ error: "Invalid file type. Allowed: jpeg, png, webp, gif" }, 400);
  }

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    return c.json({ error: "File too large. Max size: 5MB" }, 400);
  }

  // Generate unique filename
  const ext = file.name.split(".").pop() || "jpg";
  const key = `list-covers/${listId}/${Date.now()}.${ext}`;

  // Upload to R2 via S3 API
  await s3Client.send(new PutObjectCommand({
    Bucket: R2_BUCKET,
    Key: key,
    Body: Buffer.from(await file.arrayBuffer()),
    ContentType: file.type,
  }));

  // Update list's cover URL in database
  await db
    .update(gameListsTable)
    .set({ coverUrl: key, updatedAt: new Date() })
    .where(eq(gameListsTable.id, listId));

  return c.json({ coverUrl: `/api/game-lists/${listId}/cover`, key });
})

// DELETE /:listId/cover - Remove cover image from list (authenticated, owner only)
.delete('/:listId/cover', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
  const user = c.var.dbUser;

  // Check ownership
  const list = await db
    .select({ coverUrl: gameListsTable.coverUrl })
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

  if (!list.coverUrl) {
    return c.json({ error: "No cover to remove" }, 400);
  }

  // Remove list's cover URL from database (don't delete from R2 to avoid orphan issues)
  await db
    .update(gameListsTable)
    .set({ coverUrl: null, updatedAt: new Date() })
    .where(eq(gameListsTable.id, listId));

  return c.json({ removed: true });
})

// GET /:listId/cover - Serve cover image for list (public)
.get('/:listId/cover', async (c) => {
  const listId = c.req.param('listId');

  // Get list's cover key from database
  const list = await db
    .select({ coverUrl: gameListsTable.coverUrl })
    .from(gameListsTable)
    .where(eq(gameListsTable.id, listId))
    .limit(1)
    .then(res => res[0]);

  if (!list?.coverUrl) {
    return c.notFound();
  }

  // Fetch from R2 via S3 API
  try {
    const response = await s3Client.send(new GetObjectCommand({
      Bucket: R2_BUCKET,
      Key: list.coverUrl,
    }));

    if (!response.Body) {
      return c.notFound();
    }

    // Convert stream to buffer
    const chunks: Uint8Array[] = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return image with appropriate content type
    return new Response(buffer, {
      headers: {
        "Content-Type": response.ContentType || "image/jpeg",
        "Cache-Control": "public, max-age=31536000",
      },
    });
  } catch {
    return c.notFound();
  }
})

// GET /:listId/save - Check if list is saved + save count (authenticated)
.get('/:listId/save', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
  const user = c.var.dbUser;

  const [saved, saveCountResult] = await Promise.all([
    db
      .select()
      .from(savedGameListsTable)
      .where(and(
        eq(savedGameListsTable.userId, user.id),
        eq(savedGameListsTable.listId, listId)
      ))
      .limit(1),
    db
      .select({ count: count() })
      .from(savedGameListsTable)
      .where(eq(savedGameListsTable.listId, listId))
      .then(res => res[0]?.count ?? 0),
  ]);

  return c.json({
    isSaved: saved.length > 0,
    saveCount: saveCountResult,
  });
})

// POST /:listId/save - Save a list (authenticated)
.post('/:listId/save', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
  const user = c.var.dbUser;

  // Check list exists and is public
  const list = await db
    .select({ id: gameListsTable.id, userId: gameListsTable.userId, visibility: gameListsTable.visibility })
    .from(gameListsTable)
    .where(eq(gameListsTable.id, listId))
    .limit(1)
    .then(res => res[0]);

  if (!list) {
    return c.json({ error: "List not found" }, 404);
  }

  if (list.visibility !== 'public') {
    return c.json({ error: "Cannot save a private list" }, 400);
  }

  if (list.userId === user.id) {
    return c.json({ error: "Cannot save your own list" }, 400);
  }

  // Check if already saved
  const existing = await db
    .select()
    .from(savedGameListsTable)
    .where(and(
      eq(savedGameListsTable.userId, user.id),
      eq(savedGameListsTable.listId, listId)
    ))
    .limit(1);

  if (existing.length > 0) {
    return c.json({ error: "List already saved" }, 409);
  }

  await db.insert(savedGameListsTable).values({
    userId: user.id,
    listId,
  });

  return c.json({ saved: true }, 201);
})

// DELETE /:listId/save - Unsave a list (authenticated)
.delete('/:listId/save', getAuthUser, async (c) => {
  const listId = c.req.param('listId');
  const user = c.var.dbUser;

  const deleted = await db
    .delete(savedGameListsTable)
    .where(and(
      eq(savedGameListsTable.userId, user.id),
      eq(savedGameListsTable.listId, listId)
    ))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "List not saved" }, 404);
  }

  return c.json({ unsaved: true });
});
