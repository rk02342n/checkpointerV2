import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { and, count, desc, eq, inArray, isNull, isNotNull, sum } from "drizzle-orm";
import { getAuthUser, getOptionalViewer } from "../kinde";
import { assertViewableProfile } from "../lib/visibility";
import { db } from "../db";
import { steamConnectionsTable } from "../db/schema/steam-connections";
import { userSteamGamesTable } from "../db/schema/user-steam-games";
import { userSteamWishlistTable } from "../db/schema/user-steam-wishlist";
import { wantToPlayTable } from "../db/schema/want-to-play";
import { gamesTable } from "../db/schema/games";
import {
  buildSteamLoginUrl,
  verifySteamOpenId,
  syncSteamUser,
  SYNC_COOLDOWN_MS,
} from "../lib/steam";

// Steam integration routes. Writes are owner-only; reads of the imported
// library go through the same profile-visibility seam as the rest of a
// profile's activity. Wishlist promotion into want_to_play is the single
// deliberate crossing from the Steam layer into user-authored data
// (docs/steam-integration-plan.md).

/** Site origin for OpenID return_to/realm — Steam redirects the browser here. */
function appOrigin(): string {
  const url = process.env.KINDE_SITE_URL ?? process.env.KINDE_REDIRECT_URI;
  if (!url) throw new Error("Missing KINDE_SITE_URL in .env");
  return new URL(url).origin;
}

const importSchema = z.object({
  steamAppIds: z.array(z.number().int().positive()).min(1).max(2000),
});

const pageQuerySchema = z.object({
  limit: z.string().optional(),
  offset: z.string().optional(),
});

/** Steam-layer stats shared by /status (own) and /user/:userId/summary. */
async function libraryStats(userId: string) {
  const [stats] = await db
    .select({
      totalGames: count(),
      matchedGames: count(userSteamGamesTable.gameId), // count(col) skips nulls
      totalPlaytimeMin: sum(userSteamGamesTable.playtimeForeverMin),
    })
    .from(userSteamGamesTable)
    .where(eq(userSteamGamesTable.userId, userId));
  return {
    totalGames: stats?.totalGames ?? 0,
    matchedGames: stats?.matchedGames ?? 0,
    unmatchedGames: (stats?.totalGames ?? 0) - (stats?.matchedGames ?? 0),
    totalPlaytimeMin: Number(stats?.totalPlaytimeMin ?? 0),
  };
}

/** Staged wishlist rows that are matched, unimported, and not already wanted. */
function pendingWishlistFilter(userId: string) {
  return and(
    eq(userSteamWishlistTable.userId, userId),
    isNotNull(userSteamWishlistTable.gameId),
    isNull(userSteamWishlistTable.importedAt),
    isNull(wantToPlayTable.gameId),
  );
}

const pendingWishlistJoin = and(
  eq(wantToPlayTable.userId, userSteamWishlistTable.userId),
  eq(wantToPlayTable.gameId, userSteamWishlistTable.gameId),
);

export const steamRoute = new Hono()

// GET /connect - Send the user to Steam's OpenID login (authenticated)
.get("/connect", getAuthUser, (c) => {
  const origin = appOrigin();
  return c.redirect(buildSteamLoginUrl(`${origin}/api/steam/callback`, origin));
})

// GET /callback - Steam redirects back here; verify, store, first sync
.get("/callback", getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const steamId64 = await verifySteamOpenId(c.req.query());
  if (!steamId64) {
    return c.redirect("/profile?tab=steam&steam=verify_failed");
  }

  // One Steam account per Checkpointer user — reject a claim on an account
  // someone else already verified.
  const holder = await db
    .select({ userId: steamConnectionsTable.userId })
    .from(steamConnectionsTable)
    .where(eq(steamConnectionsTable.steamId64, steamId64))
    .limit(1)
    .then((rows) => rows[0]);
  if (holder && holder.userId !== user.id) {
    return c.redirect("/profile?tab=steam&steam=already_linked");
  }

  await db
    .insert(steamConnectionsTable)
    .values({ userId: user.id, steamId64 })
    .onConflictDoUpdate({
      target: steamConnectionsTable.userId,
      // Reconnecting (possibly to a different Steam account) resets the sync
      // state; the sync below replaces any stale library rows.
      set: { steamId64, syncStatus: "pending", personaName: null, avatarUrl: null, profileUrl: null },
    });

  try {
    await syncSteamUser(user.id);
  } catch (err) {
    // Connection stored; syncStatus already reflects the failure. The profile
    // surfaces it and the user can retry from there.
    console.error("Initial Steam sync failed:", err);
  }

  return c.redirect("/profile?tab=steam");
})

// GET /status - Own connection state + layer stats (authenticated)
.get("/status", getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const connection = await db
    .select()
    .from(steamConnectionsTable)
    .where(eq(steamConnectionsTable.userId, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!connection) {
    return c.json({ connected: false as const });
  }

  const [stats, pendingResult] = await Promise.all([
    libraryStats(user.id),
    db
      .select({ count: count() })
      .from(userSteamWishlistTable)
      .leftJoin(wantToPlayTable, pendingWishlistJoin)
      .where(pendingWishlistFilter(user.id))
      .then((rows) => rows[0]?.count ?? 0),
  ]);

  const lastSyncedAt = connection.lastSyncedAt;
  const nextSyncAvailableAt = lastSyncedAt
    ? new Date(lastSyncedAt.getTime() + SYNC_COOLDOWN_MS)
    : null;

  return c.json({
    connected: true as const,
    steamId64: connection.steamId64,
    personaName: connection.personaName,
    avatarUrl: connection.avatarUrl,
    profileUrl: connection.profileUrl,
    syncStatus: connection.syncStatus,
    lastSyncedAt,
    nextSyncAvailableAt,
    ...stats,
    wishlistPendingCount: pendingResult,
  });
})

// POST /sync - Manual re-sync with cooldown (authenticated)
.post("/sync", getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const connection = await db
    .select()
    .from(steamConnectionsTable)
    .where(eq(steamConnectionsTable.userId, user.id))
    .limit(1)
    .then((rows) => rows[0]);

  if (!connection) {
    return c.json({ error: "Steam account not connected" }, 404);
  }

  if (connection.lastSyncedAt) {
    const elapsed = Date.now() - connection.lastSyncedAt.getTime();
    if (elapsed < SYNC_COOLDOWN_MS) {
      return c.json(
        {
          error: "Synced recently — try again later",
          retryAfterMs: SYNC_COOLDOWN_MS - elapsed,
        },
        429,
      );
    }
  }

  const result = await syncSteamUser(user.id);
  return c.json(result);
})

// DELETE /connection - Disconnect: purge the Steam layer (authenticated).
// Rows the user explicitly promoted into want_to_play stay — those are
// user actions now.
.delete("/connection", getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const deleted = await db
    .delete(steamConnectionsTable)
    .where(eq(steamConnectionsTable.userId, user.id))
    .returning();

  if (deleted.length === 0) {
    return c.json({ error: "Steam account not connected" }, 404);
  }

  await db.delete(userSteamGamesTable).where(eq(userSteamGamesTable.userId, user.id));
  await db.delete(userSteamWishlistTable).where(eq(userSteamWishlistTable.userId, user.id));

  return c.json({ disconnected: true });
})

// GET /wishlist/pending - Steam wishlist games awaiting import (authenticated)
.get("/wishlist/pending", getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const items = await db
    .select({
      steamAppId: userSteamWishlistTable.steamAppId,
      gameId: userSteamWishlistTable.gameId,
      addedAt: userSteamWishlistTable.addedAt,
      gameName: gamesTable.name,
      gameCoverUrl: gamesTable.coverUrl,
      gameSlug: gamesTable.slug,
    })
    .from(userSteamWishlistTable)
    .innerJoin(gamesTable, eq(userSteamWishlistTable.gameId, gamesTable.id))
    .leftJoin(wantToPlayTable, pendingWishlistJoin)
    .where(pendingWishlistFilter(user.id))
    .orderBy(desc(userSteamWishlistTable.addedAt));

  return c.json({ items });
})

// POST /wishlist/import - Promote staged wishlist games into want_to_play
// (authenticated). The one deliberate write from the Steam layer into
// user-authored data; imported rows carry source='steam'.
.post("/wishlist/import", getAuthUser, zValidator("json", importSchema), async (c) => {
  const user = c.var.dbUser;
  const { steamAppIds } = c.req.valid("json");

  const staged = await db
    .select({
      steamAppId: userSteamWishlistTable.steamAppId,
      gameId: userSteamWishlistTable.gameId,
    })
    .from(userSteamWishlistTable)
    .where(
      and(
        eq(userSteamWishlistTable.userId, user.id),
        inArray(userSteamWishlistTable.steamAppId, steamAppIds),
        isNotNull(userSteamWishlistTable.gameId),
        isNull(userSteamWishlistTable.importedAt),
      ),
    );

  if (staged.length === 0) {
    return c.json({ imported: 0 });
  }

  await db
    .insert(wantToPlayTable)
    .values(
      staged.map((row) => ({
        userId: user.id,
        gameId: row.gameId!,
        source: "steam" as const,
      })),
    )
    .onConflictDoNothing();

  await db
    .update(userSteamWishlistTable)
    .set({ importedAt: new Date() })
    .where(
      and(
        eq(userSteamWishlistTable.userId, user.id),
        inArray(userSteamWishlistTable.steamAppId, staged.map((row) => row.steamAppId)),
      ),
    );

  return c.json({ imported: staged.length });
})

// GET /game/:gameId/playtime - Viewer's own Steam playtime for one game
// (authenticated; powers the "You've played Nh on Steam" chip)
.get("/game/:gameId/playtime", getAuthUser, async (c) => {
  const user = c.var.dbUser;
  const gameId = c.req.param("gameId");

  const row = await db
    .select({
      playtimeForeverMin: userSteamGamesTable.playtimeForeverMin,
      lastPlayedAt: userSteamGamesTable.lastPlayedAt,
    })
    .from(userSteamGamesTable)
    .where(and(eq(userSteamGamesTable.userId, user.id), eq(userSteamGamesTable.gameId, gameId)))
    .limit(1)
    .then((rows) => rows[0]);

  return c.json({ playtime: row ?? null });
})

// GET /user/:userId/summary - Steam presence + stats for a profile
// (public; private profiles → owner only)
.get("/user/:userId/summary", getOptionalViewer, async (c) => {
  const userId = c.req.param("userId");
  await assertViewableProfile(userId, c.var.viewer);

  const connection = await db
    .select({
      personaName: steamConnectionsTable.personaName,
      profileUrl: steamConnectionsTable.profileUrl,
      lastSyncedAt: steamConnectionsTable.lastSyncedAt,
    })
    .from(steamConnectionsTable)
    .where(eq(steamConnectionsTable.userId, userId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!connection) {
    return c.json({ connected: false as const });
  }

  const stats = await libraryStats(userId);
  return c.json({ connected: true as const, ...connection, ...stats });
})

// GET /user/:userId/library - Matched Steam games by playtime
// (public; private profiles → owner only)
.get("/user/:userId/library", getOptionalViewer, zValidator("query", pageQuerySchema), async (c) => {
  const userId = c.req.param("userId");
  await assertViewableProfile(userId, c.var.viewer);
  const query = c.req.valid("query");
  const limit = Math.min(Number(query.limit) || 20, 50);
  const offset = Number(query.offset) || 0;

  const [totalCount, library] = await Promise.all([
    db
      .select({ count: count() })
      .from(userSteamGamesTable)
      .where(and(eq(userSteamGamesTable.userId, userId), isNotNull(userSteamGamesTable.gameId)))
      .then((rows) => rows[0]?.count ?? 0),
    db
      .select({
        steamAppId: userSteamGamesTable.steamAppId,
        playtimeForeverMin: userSteamGamesTable.playtimeForeverMin,
        playtime2WeeksMin: userSteamGamesTable.playtime2WeeksMin,
        lastPlayedAt: userSteamGamesTable.lastPlayedAt,
        gameId: gamesTable.id,
        gameName: gamesTable.name,
        gameCoverUrl: gamesTable.coverUrl,
        gameSlug: gamesTable.slug,
      })
      .from(userSteamGamesTable)
      .innerJoin(gamesTable, eq(userSteamGamesTable.gameId, gamesTable.id))
      .where(eq(userSteamGamesTable.userId, userId))
      .orderBy(desc(userSteamGamesTable.playtimeForeverMin))
      .limit(limit + 1)
      .offset(offset),
  ]);

  const hasMore = library.length > limit;
  return c.json({
    library: hasMore ? library.slice(0, limit) : library,
    hasMore,
    nextOffset: hasMore ? offset + limit : null,
    totalCount,
  });
})

// GET /user/:userId/unmatched - Steam entries without a catalog match
// (public; private profiles → owner only)
.get("/user/:userId/unmatched", getOptionalViewer, async (c) => {
  const userId = c.req.param("userId");
  await assertViewableProfile(userId, c.var.viewer);

  const items = await db
    .select({
      steamAppId: userSteamGamesTable.steamAppId,
      name: userSteamGamesTable.name,
      playtimeForeverMin: userSteamGamesTable.playtimeForeverMin,
    })
    .from(userSteamGamesTable)
    .where(and(eq(userSteamGamesTable.userId, userId), isNull(userSteamGamesTable.gameId)))
    .orderBy(desc(userSteamGamesTable.playtimeForeverMin))
    .limit(500);

  return c.json({ items });
});
