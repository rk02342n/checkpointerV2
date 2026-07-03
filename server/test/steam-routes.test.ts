import { beforeAll, beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
import { and, eq } from "drizzle-orm";

import {
  testDb,
  migrateTestDb,
  resetAndSeed,
  actingUser,
  setActingUser,
  actingViewer,
  setActingViewer,
  type Seed,
} from "./harness";

// Steam route tests. DB and auth are mocked as in images.test.ts; the Steam
// network edge is a fetch stub with canned responses, so /callback and /sync
// exercise the real OpenID verification and sync engine end to end.

process.env.STEAM_API_KEY ??= "test-key";
process.env.KINDE_SITE_URL ??= "https://cp.test";

mock.module("../db", () => ({ db: testDb }));
mock.module("../kinde", () => ({
  getAuthUser: async (c: any, next: any) => {
    c.set("dbUser", actingUser());
    await next();
  },
  getOptionalViewer: async (c: any, next: any) => {
    c.set("viewer", actingViewer());
    await next();
  },
  kindeClient: {},
  sessionManager: () => ({}),
  requireRole: () => async (_c: any, next: any) => next(),
  requireMinRole: () => async (_c: any, next: any) => next(),
}));

const { steamConnectionsTable } = await import("../db/schema/steam-connections");
const { userSteamGamesTable } = await import("../db/schema/user-steam-games");
const { userSteamWishlistTable } = await import("../db/schema/user-steam-wishlist");
const { steamAppMapTable } = await import("../db/schema/steam-app-map");
const { wantToPlayTable } = await import("../db/schema/want-to-play");
const { errorHandler } = await import("../lib/errors");

const { steamRoute } = await import("../routes/steam");
const app = new Hono().basePath("/api").route("/steam", steamRoute);
app.onError(errorHandler);

const STEAM_ID = "76561198000000001";
const MATCHED_APPID = 440;

/** Canned Steam responses so real verify/sync code paths run without network. */
function stubSteamFetch() {
  const original = globalThis.fetch;
  globalThis.fetch = (async (input: any) => {
    const url = String(input instanceof Request ? input.url : input);
    if (url.includes("steamcommunity.com/openid/login")) {
      return new Response("ns:http://specs.openid.net/auth/2.0\nis_valid:true\n");
    }
    if (url.includes("GetPlayerSummaries")) {
      return Response.json({
        response: { players: [{ personaname: "RoutePersona", avatarfull: "https://a.test/x.jpg", profileurl: `https://steamcommunity.com/profiles/${STEAM_ID}` }] },
      });
    }
    if (url.includes("GetOwnedGames")) {
      return Response.json({
        response: {
          game_count: 2,
          games: [
            { appid: MATCHED_APPID, name: "Team Fortress 2", playtime_forever: 6000 },
            { appid: 999, name: "Obscure Game", playtime_forever: 30 },
          ],
        },
      });
    }
    if (url.includes("GetWishlist")) {
      return Response.json({ response: { items: [{ appid: MATCHED_APPID, date_added: 1767225600 }] } });
    }
    throw new Error(`Unexpected fetch in test: ${url}`);
  }) as typeof fetch;
  return () => {
    globalThis.fetch = original;
  };
}

/** Untyped JSON body for assertions (app.request responses type json() as unknown). */
const json = async (res: Response) => (await res.json()) as any;

const openIdCallbackQuery = new URLSearchParams({
  "openid.ns": "http://specs.openid.net/auth/2.0",
  "openid.mode": "id_res",
  "openid.claimed_id": `https://steamcommunity.com/openid/id/${STEAM_ID}`,
  "openid.sig": "sig",
}).toString();

let seed: Seed;

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  seed = await resetAndSeed();
  setActingUser(seed.owner);
  setActingViewer(null);
  await testDb.delete(steamAppMapTable);
  await testDb.insert(steamAppMapTable).values({ steamAppId: MATCHED_APPID, igdbId: 1 });
});

async function connectOwner(overrides: Partial<typeof steamConnectionsTable.$inferInsert> = {}) {
  await testDb.insert(steamConnectionsTable).values({
    userId: seed.owner.id,
    steamId64: STEAM_ID,
    ...overrides,
  });
}

describe("GET /api/steam/callback", () => {
  it("verifies, stores the connection, and runs the first sync", async () => {
    const restore = stubSteamFetch();
    try {
      const res = await app.request(`/api/steam/callback?${openIdCallbackQuery}`);
      expect(res.status).toBe(302);
      expect(res.headers.get("location")).toBe("/profile?tab=steam");
    } finally {
      restore();
    }

    const [connection] = await testDb
      .select()
      .from(steamConnectionsTable)
      .where(eq(steamConnectionsTable.userId, seed.owner.id));
    expect(connection!.steamId64).toBe(STEAM_ID);
    expect(connection!.syncStatus).toBe("ok");
    expect(connection!.personaName).toBe("RoutePersona");

    const games = await testDb
      .select()
      .from(userSteamGamesTable)
      .where(eq(userSteamGamesTable.userId, seed.owner.id));
    expect(games).toHaveLength(2);
  });

  it("redirects with verify_failed when the assertion is rejected", async () => {
    const res = await app.request(
      `/api/steam/callback?${new URLSearchParams({ "openid.mode": "cancel" })}`,
    );
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toContain("steam=verify_failed");
  });

  it("rejects a Steam account already linked to another user", async () => {
    await testDb.insert(steamConnectionsTable).values({
      userId: seed.other.id,
      steamId64: STEAM_ID,
    });

    const restore = stubSteamFetch();
    try {
      const res = await app.request(`/api/steam/callback?${openIdCallbackQuery}`);
      expect(res.headers.get("location")).toContain("steam=already_linked");
    } finally {
      restore();
    }

    const rows = await testDb
      .select()
      .from(steamConnectionsTable)
      .where(eq(steamConnectionsTable.userId, seed.owner.id));
    expect(rows).toHaveLength(0);
  });
});

describe("GET /api/steam/status", () => {
  it("reports connected:false without a connection", async () => {
    const res = await app.request("/api/steam/status");
    expect(await res.json()).toEqual({ connected: false });
  });

  it("reports stats and pending wishlist count", async () => {
    await connectOwner({ syncStatus: "ok", personaName: "P" });
    await testDb.insert(userSteamGamesTable).values([
      { userId: seed.owner.id, steamAppId: MATCHED_APPID, gameId: seed.gameId, name: "TF2", playtimeForeverMin: 6000 },
      { userId: seed.owner.id, steamAppId: 999, gameId: null, name: "Obscure", playtimeForeverMin: 30 },
    ]);
    await testDb.insert(userSteamWishlistTable).values([
      // pending: matched, unimported, not in want_to_play
      { userId: seed.owner.id, steamAppId: MATCHED_APPID, gameId: seed.gameId, name: "TF2" },
      // not pending: unmatched
      { userId: seed.owner.id, steamAppId: 777, gameId: null },
    ]);

    const body = await json(await app.request("/api/steam/status"));
    expect(body.connected).toBe(true);
    expect(body.totalGames).toBe(2);
    expect(body.matchedGames).toBe(1);
    expect(body.unmatchedGames).toBe(1);
    expect(body.totalPlaytimeMin).toBe(6030);
    expect(body.wishlistPendingCount).toBe(1);
  });
});

describe("POST /api/steam/sync", () => {
  it("404s without a connection", async () => {
    const res = await app.request("/api/steam/sync", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("429s inside the cooldown window", async () => {
    await connectOwner({ lastSyncedAt: new Date() });
    const res = await app.request("/api/steam/sync", { method: "POST" });
    expect(res.status).toBe(429);
    const body = await json(res);
    expect(body.retryAfterMs).toBeGreaterThan(0);
  });

  it("syncs once the cooldown has passed", async () => {
    await connectOwner({ lastSyncedAt: new Date(Date.now() - 11 * 60 * 1000) });
    const restore = stubSteamFetch();
    try {
      const res = await app.request("/api/steam/sync", { method: "POST" });
      expect(res.status).toBe(200);
      const body = await json(res);
      expect(body.status).toBe("ok");
      expect(body.totalGames).toBe(2);
      expect(body.matchedGames).toBe(1);
    } finally {
      restore();
    }
  });
});

describe("wishlist import", () => {
  beforeEach(async () => {
    await connectOwner();
    await testDb.insert(userSteamWishlistTable).values([
      { userId: seed.owner.id, steamAppId: MATCHED_APPID, gameId: seed.gameId, name: "TF2" },
      { userId: seed.owner.id, steamAppId: 777, gameId: null },
    ]);
  });

  it("lists only matched, unimported, not-yet-wanted games as pending", async () => {
    const body = await json(await app.request("/api/steam/wishlist/pending"));
    expect(body.items).toHaveLength(1);
    expect(body.items[0].steamAppId).toBe(MATCHED_APPID);
    expect(body.items[0].gameName).toBe("Test Game");
  });

  it("hides pending entries already in want_to_play", async () => {
    await testDb.insert(wantToPlayTable).values({ userId: seed.owner.id, gameId: seed.gameId });
    const body = await json(await app.request("/api/steam/wishlist/pending"));
    expect(body.items).toHaveLength(0);
  });

  it("promotes into want_to_play with source=steam and stamps importedAt", async () => {
    const res = await app.request("/api/steam/wishlist/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steamAppIds: [MATCHED_APPID, 777] }),
    });
    expect(await res.json()).toEqual({ imported: 1 }); // 777 unmatched, skipped

    const [wtp] = await testDb
      .select()
      .from(wantToPlayTable)
      .where(and(eq(wantToPlayTable.userId, seed.owner.id), eq(wantToPlayTable.gameId, seed.gameId)));
    expect(wtp!.source).toBe("steam");

    const [staged] = await testDb
      .select()
      .from(userSteamWishlistTable)
      .where(
        and(
          eq(userSteamWishlistTable.userId, seed.owner.id),
          eq(userSteamWishlistTable.steamAppId, MATCHED_APPID),
        ),
      );
    expect(staged!.importedAt).not.toBeNull();

    // Idempotent: a second import promotes nothing.
    const again = await app.request("/api/steam/wishlist/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ steamAppIds: [MATCHED_APPID] }),
    });
    expect(await again.json()).toEqual({ imported: 0 });
  });
});

describe("DELETE /api/steam/connection", () => {
  it("purges the Steam layer but keeps promoted want_to_play rows", async () => {
    await connectOwner();
    await testDb.insert(userSteamGamesTable).values({
      userId: seed.owner.id,
      steamAppId: MATCHED_APPID,
      gameId: seed.gameId,
      name: "TF2",
    });
    await testDb.insert(userSteamWishlistTable).values({
      userId: seed.owner.id,
      steamAppId: MATCHED_APPID,
      gameId: seed.gameId,
      importedAt: new Date(),
    });
    await testDb.insert(wantToPlayTable).values({
      userId: seed.owner.id,
      gameId: seed.gameId,
      source: "steam",
    });

    const res = await app.request("/api/steam/connection", { method: "DELETE" });
    expect(await res.json()).toEqual({ disconnected: true });

    expect(await testDb.select().from(steamConnectionsTable)).toHaveLength(0);
    expect(await testDb.select().from(userSteamGamesTable)).toHaveLength(0);
    expect(await testDb.select().from(userSteamWishlistTable)).toHaveLength(0);
    expect(
      await testDb.select().from(wantToPlayTable).where(eq(wantToPlayTable.userId, seed.owner.id)),
    ).toHaveLength(1);

    const again = await app.request("/api/steam/connection", { method: "DELETE" });
    expect(again.status).toBe(404);
  });
});

describe("public profile reads", () => {
  beforeEach(async () => {
    await connectOwner({ personaName: "P", syncStatus: "ok" });
    await testDb.insert(userSteamGamesTable).values([
      { userId: seed.owner.id, steamAppId: MATCHED_APPID, gameId: seed.gameId, name: "TF2", playtimeForeverMin: 6000 },
      { userId: seed.owner.id, steamAppId: 999, gameId: null, name: "Obscure", playtimeForeverMin: 30 },
    ]);
  });

  it("serves summary, matched library, and unmatched list to anonymous viewers", async () => {
    const summary = await json(await app.request(`/api/steam/user/${seed.owner.id}/summary`));
    expect(summary.connected).toBe(true);
    expect(summary.personaName).toBe("P");
    expect(summary.totalGames).toBe(2);

    const library = await json(await app.request(`/api/steam/user/${seed.owner.id}/library`));
    expect(library.totalCount).toBe(1); // matched only
    expect(library.library[0].gameName).toBe("Test Game");
    expect(library.library[0].playtimeForeverMin).toBe(6000);

    const unmatched = await json(await app.request(`/api/steam/user/${seed.owner.id}/unmatched`));
    expect(unmatched.items).toHaveLength(1);
    expect(unmatched.items[0].name).toBe("Obscure");
  });

  it("hides a private profile's Steam data from strangers but not the owner", async () => {
    const { usersTable } = await import("../db/schema/users");
    await testDb.update(usersTable).set({ isPublic: false }).where(eq(usersTable.id, seed.owner.id));

    const anonRes = await app.request(`/api/steam/user/${seed.owner.id}/summary`);
    expect(anonRes.status).toBe(404);

    setActingViewer(seed.owner);
    const ownerRes = await app.request(`/api/steam/user/${seed.owner.id}/summary`);
    expect(ownerRes.status).toBe(200);
  });
});

describe("game page playtime", () => {
  it("returns the viewer's own playtime for a matched game, null otherwise", async () => {
    await connectOwner();
    await testDb.insert(userSteamGamesTable).values({
      userId: seed.owner.id,
      steamAppId: MATCHED_APPID,
      gameId: seed.gameId,
      name: "TF2",
      playtimeForeverMin: 6000,
    });

    const body = await json(await app.request(`/api/steam/game/${seed.gameId}/playtime`));
    expect(body.playtime.playtimeForeverMin).toBe(6000);

    setActingUser(seed.other);
    const other = await json(await app.request(`/api/steam/game/${seed.gameId}/playtime`));
    expect(other.playtime).toBeNull();
  });
});
