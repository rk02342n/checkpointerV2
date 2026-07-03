import { beforeAll, beforeEach, describe, expect, it } from "bun:test";
import { eq } from "drizzle-orm";

import { testDb, migrateTestDb, resetAndSeed, type Seed } from "./harness";
import {
  buildSteamLoginUrl,
  verifySteamOpenId,
  syncSteamUser,
  type SteamApi,
} from "../lib/steam";
import { steamConnectionsTable } from "../db/schema/steam-connections";
import { userSteamGamesTable } from "../db/schema/user-steam-games";
import { userSteamWishlistTable } from "../db/schema/user-steam-wishlist";
import { steamAppMapTable } from "../db/schema/steam-app-map";

// Steam-seam tests: OpenID assertion handling and the sync engine's contract —
// idempotent upserts, stale-row removal, match resolution through
// steam_app_map, private-profile flagging, and importedAt survival.

const STEAM_ID = "76561198000000001";
const MATCHED_APPID = 440; // mapped to the seeded game (igdbId 1)
const UNMATCHED_APPID = 999;

function fakeApi(overrides: Partial<SteamApi> = {}): SteamApi {
  return {
    getPlayerSummary: async () => ({
      personaName: "TestPersona",
      avatarUrl: "https://avatars.example/full.jpg",
      profileUrl: `https://steamcommunity.com/profiles/${STEAM_ID}`,
    }),
    getOwnedGames: async () => ({
      visible: true,
      games: [
        { appid: MATCHED_APPID, name: "Team Fortress 2", playtime_forever: 6000, playtime_2weeks: 120, rtime_last_played: 1700000000 },
        { appid: UNMATCHED_APPID, name: "Obscure Game", playtime_forever: 30 },
      ],
    }),
    getWishlist: async () => [
      { appid: MATCHED_APPID, addedAt: new Date("2026-01-01") },
      { appid: 777, addedAt: null },
    ],
    ...overrides,
  };
}

let seed: Seed;

beforeAll(async () => {
  await migrateTestDb();
});

beforeEach(async () => {
  seed = await resetAndSeed();
  await testDb.delete(steamAppMapTable);
  await testDb.insert(steamAppMapTable).values({ steamAppId: MATCHED_APPID, igdbId: 1 });
});

async function connect(userId: string) {
  await testDb.insert(steamConnectionsTable).values({ userId, steamId64: STEAM_ID });
}

describe("OpenID", () => {
  it("builds a checkid_setup login URL carrying return_to and realm", () => {
    const url = new URL(buildSteamLoginUrl("https://cp.io/api/steam/callback", "https://cp.io"));
    expect(url.origin + url.pathname).toBe("https://steamcommunity.com/openid/login");
    expect(url.searchParams.get("openid.mode")).toBe("checkid_setup");
    expect(url.searchParams.get("openid.return_to")).toBe("https://cp.io/api/steam/callback");
    expect(url.searchParams.get("openid.realm")).toBe("https://cp.io");
  });

  const validQuery = {
    "openid.ns": "http://specs.openid.net/auth/2.0",
    "openid.mode": "id_res",
    "openid.claimed_id": `https://steamcommunity.com/openid/id/${STEAM_ID}`,
    "openid.sig": "abc",
  };

  const respondingWith = (text: string) =>
    (async () => new Response(text)) as unknown as typeof fetch;

  it("returns the steamId64 when Steam confirms the assertion", async () => {
    const id = await verifySteamOpenId(validQuery, respondingWith("ns:...\nis_valid:true\n"));
    expect(id).toBe(STEAM_ID);
  });

  it("rejects when Steam does not confirm", async () => {
    const id = await verifySteamOpenId(validQuery, respondingWith("is_valid:false\n"));
    expect(id).toBeNull();
  });

  it("rejects a claimed_id that is not a Steam profile URL", async () => {
    const id = await verifySteamOpenId(
      { ...validQuery, "openid.claimed_id": "https://evil.example/openid/id/123" },
      respondingWith("is_valid:true\n"),
    );
    expect(id).toBeNull();
  });

  it("rejects a non-id_res mode without calling Steam", async () => {
    const id = await verifySteamOpenId(
      { ...validQuery, "openid.mode": "cancel" },
      (() => {
        throw new Error("should not fetch");
      }) as unknown as typeof fetch,
    );
    expect(id).toBeNull();
  });
});

describe("syncSteamUser", () => {
  it("throws 404 when the user has no Steam connection", async () => {
    await expect(
      syncSteamUser(seed.owner.id, { conn: testDb, api: fakeApi() }),
    ).rejects.toThrow("Steam account not connected");
  });

  it("imports library and wishlist, resolving matches through steam_app_map", async () => {
    await connect(seed.owner.id);
    const result = await syncSteamUser(seed.owner.id, { conn: testDb, api: fakeApi() });

    expect(result).toEqual({ status: "ok", totalGames: 2, matchedGames: 1, wishlistCount: 2 });

    const games = await testDb
      .select()
      .from(userSteamGamesTable)
      .where(eq(userSteamGamesTable.userId, seed.owner.id));
    const matched = games.find((g) => g.steamAppId === MATCHED_APPID)!;
    const unmatched = games.find((g) => g.steamAppId === UNMATCHED_APPID)!;
    expect(matched.gameId).toBe(seed.gameId);
    expect(matched.playtimeForeverMin).toBe(6000);
    expect(matched.lastPlayedAt).toEqual(new Date(1700000000 * 1000));
    expect(unmatched.gameId).toBeNull();

    const wishlist = await testDb
      .select()
      .from(userSteamWishlistTable)
      .where(eq(userSteamWishlistTable.userId, seed.owner.id));
    expect(wishlist).toHaveLength(2);
    const matchedWish = wishlist.find((w) => w.steamAppId === MATCHED_APPID)!;
    const unmatchedWish = wishlist.find((w) => w.steamAppId === 777)!;
    expect(matchedWish.name).toBe("Test Game"); // name comes from the catalog match
    expect(matchedWish.gameId).toBe(seed.gameId);
    expect(unmatchedWish.name).toBeNull();

    const [connection] = await testDb
      .select()
      .from(steamConnectionsTable)
      .where(eq(steamConnectionsTable.userId, seed.owner.id));
    expect(connection!.syncStatus).toBe("ok");
    expect(connection!.personaName).toBe("TestPersona");
    expect(connection!.lastSyncedAt).not.toBeNull();
  });

  it("re-sync updates playtime, removes departed rows, and preserves importedAt", async () => {
    await connect(seed.owner.id);
    await syncSteamUser(seed.owner.id, { conn: testDb, api: fakeApi() });

    // User promoted the matched wishlist entry into want_to_play.
    await testDb
      .update(userSteamWishlistTable)
      .set({ importedAt: new Date("2026-02-01") })
      .where(eq(userSteamWishlistTable.userId, seed.owner.id));

    await syncSteamUser(seed.owner.id, {
      conn: testDb,
      api: fakeApi({
        getOwnedGames: async () => ({
          visible: true,
          games: [{ appid: MATCHED_APPID, name: "Team Fortress 2", playtime_forever: 7000 }],
        }),
        getWishlist: async () => [{ appid: MATCHED_APPID, addedAt: new Date("2026-01-01") }],
      }),
    });

    const games = await testDb
      .select()
      .from(userSteamGamesTable)
      .where(eq(userSteamGamesTable.userId, seed.owner.id));
    expect(games).toHaveLength(1);
    expect(games[0]!.playtimeForeverMin).toBe(7000);

    const wishlist = await testDb
      .select()
      .from(userSteamWishlistTable)
      .where(eq(userSteamWishlistTable.userId, seed.owner.id));
    expect(wishlist).toHaveLength(1);
    expect(wishlist[0]!.steamAppId).toBe(MATCHED_APPID);
    expect(wishlist[0]!.importedAt).toEqual(new Date("2026-02-01"));
  });

  it("links previously unmatched games once steam_app_map learns the appid", async () => {
    await connect(seed.owner.id);
    await syncSteamUser(seed.owner.id, { conn: testDb, api: fakeApi() });

    await testDb.insert(steamAppMapTable).values({ steamAppId: UNMATCHED_APPID, igdbId: 1 });
    await syncSteamUser(seed.owner.id, { conn: testDb, api: fakeApi() });

    const [row] = await testDb
      .select()
      .from(userSteamGamesTable)
      .where(eq(userSteamGamesTable.steamAppId, UNMATCHED_APPID));
    expect(row!.gameId).toBe(seed.gameId);
  });

  it("flags a private profile and keeps the last snapshot", async () => {
    await connect(seed.owner.id);
    await syncSteamUser(seed.owner.id, { conn: testDb, api: fakeApi() });

    const result = await syncSteamUser(seed.owner.id, {
      conn: testDb,
      api: fakeApi({ getOwnedGames: async () => ({ visible: false }) }),
    });
    expect(result.status).toBe("private_profile");

    const games = await testDb
      .select()
      .from(userSteamGamesTable)
      .where(eq(userSteamGamesTable.userId, seed.owner.id));
    expect(games).toHaveLength(2); // snapshot untouched

    const [connection] = await testDb
      .select()
      .from(steamConnectionsTable)
      .where(eq(steamConnectionsTable.userId, seed.owner.id));
    expect(connection!.syncStatus).toBe("private_profile");
  });

  it("marks the connection errored when the Steam API fails, and rethrows", async () => {
    await connect(seed.owner.id);

    await expect(
      syncSteamUser(seed.owner.id, {
        conn: testDb,
        api: fakeApi({
          getOwnedGames: async () => {
            throw new Error("Steam API error: 503");
          },
        }),
      }),
    ).rejects.toThrow("Steam API error: 503");

    const [connection] = await testDb
      .select()
      .from(steamConnectionsTable)
      .where(eq(steamConnectionsTable.userId, seed.owner.id));
    expect(connection!.syncStatus).toBe("error");
  });
});
