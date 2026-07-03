import { and, eq, inArray, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/pg-core";
import { db } from "../db";
import { steamConnectionsTable } from "../db/schema/steam-connections";
import { userSteamGamesTable } from "../db/schema/user-steam-games";
import { userSteamWishlistTable } from "../db/schema/user-steam-wishlist";
import { steamAppMapTable } from "../db/schema/steam-app-map";
import { gamesTable } from "../db/schema/games";
import { chunk, DB_INSERT_CHUNK } from "./igdb";
import { notFound } from "./errors";

// The Steam seam: Web API client, OpenID 2.0 ownership verification, and the
// per-user sync engine. Sync is idempotent — a route calls it today, a cron
// can call it tomorrow (docs/steam-integration-plan.md).
//
// Layering rule: sync writes only to the Steam layer tables
// (steam_connections, user_steam_games, user_steam_wishlist). It never touches
// game_logs or want_to_play — those stay human-authored; wishlist promotion is
// a separate explicit user action handled in the routes.

const STEAM_API_BASE = "https://api.steampowered.com";
const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid/login";
const OPENID_NS = "http://specs.openid.net/auth/2.0";
const OPENID_IDENTIFIER_SELECT = "http://specs.openid.net/auth/2.0/identifier_select";
const CLAIMED_ID_PATTERN = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;

/** Minimum time between manual syncs for one user. */
export const SYNC_COOLDOWN_MS = 10 * 60 * 1000;

// Accept any conn with the four query verbs so tests can inject a scratch
// database, mirroring the ownership module.
type Conn = Pick<PgDatabase<any, any, any>, "select" | "insert" | "update" | "delete">;

function steamApiKey(): string {
  const key = process.env.STEAM_API_KEY;
  if (!key) throw new Error("Missing STEAM_API_KEY in .env");
  return key;
}

// --- OpenID 2.0 (ownership verification) ---

/**
 * URL to send the user to for "Sign in through Steam". `returnTo` is the
 * absolute callback URL; `realm` is the site origin shown on Steam's consent
 * page and must be a prefix of `returnTo`.
 */
export function buildSteamLoginUrl(returnTo: string, realm: string): string {
  const params = new URLSearchParams({
    "openid.ns": OPENID_NS,
    "openid.mode": "checkid_setup",
    "openid.claimed_id": OPENID_IDENTIFIER_SELECT,
    "openid.identity": OPENID_IDENTIFIER_SELECT,
    "openid.return_to": returnTo,
    "openid.realm": realm,
  });
  return `${STEAM_OPENID_ENDPOINT}?${params}`;
}

/**
 * Verify an OpenID callback and return the proven steamId64, or null if the
 * assertion is invalid. Verification echoes the signed params back to Steam
 * with mode=check_authentication; only Steam's own "is_valid:true" counts —
 * nothing in the query string is trusted by itself.
 */
export async function verifySteamOpenId(
  query: Record<string, string>,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  if (query["openid.mode"] !== "id_res") return null;
  if (query["openid.ns"] !== OPENID_NS) return null;

  const claimedId = query["openid.claimed_id"] ?? "";
  const steamId64 = CLAIMED_ID_PATTERN.exec(claimedId)?.[1];
  if (!steamId64) return null;

  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key.startsWith("openid.")) body.set(key, value);
  }
  body.set("openid.mode", "check_authentication");

  const res = await fetchImpl(STEAM_OPENID_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) return null;

  const text = await res.text();
  return /is_valid\s*:\s*true/.test(text) ? steamId64 : null;
}

// --- Steam Web API client ---

export interface SteamOwnedGame {
  appid: number;
  name?: string;
  playtime_forever: number; // minutes
  playtime_2weeks?: number; // minutes
  rtime_last_played?: number; // unix seconds, 0 = never
}

/** GetOwnedGames returns an empty response when game details are private. */
export type OwnedGamesResult =
  | { visible: true; games: SteamOwnedGame[] }
  | { visible: false };

export interface SteamPlayerSummary {
  personaName: string | null;
  avatarUrl: string | null;
  profileUrl: string | null;
}

export interface SteamWishlistEntry {
  appid: number;
  addedAt: Date | null;
}

export interface SteamApi {
  getPlayerSummary(steamId64: string): Promise<SteamPlayerSummary | null>;
  getOwnedGames(steamId64: string): Promise<OwnedGamesResult>;
  getWishlist(steamId64: string): Promise<SteamWishlistEntry[]>;
}

async function steamGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams({ key: steamApiKey(), ...params });
  const res = await fetch(`${STEAM_API_BASE}/${path}?${qs}`);
  if (!res.ok) {
    throw new Error(`Steam API error: ${res.status} on ${path}`);
  }
  return res.json() as Promise<T>;
}

export const realSteamApi: SteamApi = {
  async getPlayerSummary(steamId64) {
    const data = await steamGet<{
      response: { players?: { personaname?: string; avatarfull?: string; profileurl?: string }[] };
    }>("ISteamUser/GetPlayerSummaries/v2/", { steamids: steamId64 });
    const player = data.response.players?.[0];
    if (!player) return null;
    return {
      personaName: player.personaname ?? null,
      avatarUrl: player.avatarfull ?? null,
      profileUrl: player.profileurl ?? null,
    };
  },

  async getOwnedGames(steamId64) {
    const data = await steamGet<{
      response: { game_count?: number; games?: SteamOwnedGame[] };
    }>("IPlayerService/GetOwnedGames/v1/", {
      steamid: steamId64,
      include_appinfo: "1",
      include_played_free_games: "1",
    });
    // Private game details come back as `{ response: {} }` — no game_count at
    // all, unlike a public empty library which has game_count: 0.
    if (data.response.game_count === undefined) return { visible: false };
    return { visible: true, games: data.response.games ?? [] };
  },

  async getWishlist(steamId64) {
    const data = await steamGet<{
      response: { items?: { appid: number; date_added?: number }[] };
    }>("IWishlistService/GetWishlist/v1/", { steamid: steamId64 });
    // A private wishlist is indistinguishable from an empty one here; both
    // yield no items, which sync treats as "nothing staged" — acceptable.
    return (data.response.items ?? []).map((item) => ({
      appid: item.appid,
      addedAt: item.date_added ? new Date(item.date_added * 1000) : null,
    }));
  },
};

// --- Sync engine ---

export interface SteamSyncResult {
  status: "ok" | "private_profile";
  totalGames: number;
  matchedGames: number;
  wishlistCount: number;
}

/** Resolve Steam appids to catalog games via steam_app_map → games.igdbId. */
async function mapAppIdsToGames(
  conn: Conn,
  appIds: number[],
): Promise<Map<number, { gameId: string; name: string }>> {
  const matches = new Map<number, { gameId: string; name: string }>();
  for (const ids of chunk(appIds, DB_INSERT_CHUNK)) {
    const rows = await conn
      .select({
        steamAppId: steamAppMapTable.steamAppId,
        gameId: gamesTable.id,
        name: gamesTable.name,
      })
      .from(steamAppMapTable)
      .innerJoin(gamesTable, eq(gamesTable.igdbId, steamAppMapTable.igdbId))
      .where(inArray(steamAppMapTable.steamAppId, ids));
    for (const row of rows) {
      matches.set(row.steamAppId, { gameId: row.gameId, name: row.name });
    }
  }
  return matches;
}

/** Delete a user's layer rows whose appid is no longer in the synced set. */
async function deleteStaleRows(
  conn: Conn,
  table: typeof userSteamGamesTable | typeof userSteamWishlistTable,
  userId: string,
  currentAppIds: Set<number>,
): Promise<void> {
  const existing = await conn
    .select({ steamAppId: table.steamAppId })
    .from(table)
    .where(eq(table.userId, userId));
  const stale = existing
    .map((row) => row.steamAppId)
    .filter((appId) => !currentAppIds.has(appId));
  for (const ids of chunk(stale, DB_INSERT_CHUNK)) {
    await conn.delete(table).where(
      and(eq(table.userId, userId), inArray(table.steamAppId, ids)),
    );
  }
}

/**
 * Pull the user's Steam library, wishlist, and profile info into the Steam
 * layer. Idempotent: upserts by (userId, steamAppId), removes rows that left
 * the library, re-resolves IGDB matches every run (so games unmatched today
 * link up after the weekly steam_app_map refresh), and never clears
 * user_steam_wishlist.importedAt.
 */
export async function syncSteamUser(
  userId: string,
  opts: { conn?: Conn; api?: SteamApi } = {},
): Promise<SteamSyncResult> {
  const conn = opts.conn ?? db;
  const api = opts.api ?? realSteamApi;

  const connection = await conn
    .select()
    .from(steamConnectionsTable)
    .where(eq(steamConnectionsTable.userId, userId))
    .limit(1)
    .then((rows: (typeof steamConnectionsTable.$inferSelect)[]) => rows[0]);
  if (!connection) throw notFound("Steam account not connected");

  const now = new Date();
  try {
    const [summary, owned, wishlist] = await Promise.all([
      api.getPlayerSummary(connection.steamId64),
      api.getOwnedGames(connection.steamId64),
      api.getWishlist(connection.steamId64),
    ]);

    const personaUpdate = summary
      ? {
          personaName: summary.personaName,
          avatarUrl: summary.avatarUrl,
          profileUrl: summary.profileUrl,
        }
      : {};

    if (!owned.visible) {
      // Keep the last good snapshot; just flag the state so the UI can point
      // the user at Steam's privacy settings. lastSyncedAt still advances so
      // the cooldown applies to failed attempts too.
      await conn
        .update(steamConnectionsTable)
        .set({ ...personaUpdate, syncStatus: "private_profile", lastSyncedAt: now })
        .where(eq(steamConnectionsTable.userId, userId));
      return { status: "private_profile", totalGames: 0, matchedGames: 0, wishlistCount: 0 };
    }

    const allAppIds = [
      ...new Set([...owned.games.map((g) => g.appid), ...wishlist.map((w) => w.appid)]),
    ];
    const matches = await mapAppIdsToGames(conn, allAppIds);

    const gameRows = owned.games.map((game) => ({
      userId,
      steamAppId: game.appid,
      gameId: matches.get(game.appid)?.gameId ?? null,
      name: game.name ?? matches.get(game.appid)?.name ?? `App ${game.appid}`,
      playtimeForeverMin: game.playtime_forever,
      playtime2WeeksMin: game.playtime_2weeks ?? 0,
      lastPlayedAt: game.rtime_last_played ? new Date(game.rtime_last_played * 1000) : null,
      syncedAt: now,
    }));
    for (const rows of chunk(gameRows, DB_INSERT_CHUNK)) {
      await conn
        .insert(userSteamGamesTable)
        .values(rows)
        .onConflictDoUpdate({
          target: [userSteamGamesTable.userId, userSteamGamesTable.steamAppId],
          set: {
            gameId: sql`excluded.game_id`,
            name: sql`excluded.name`,
            playtimeForeverMin: sql`excluded.playtime_forever_min`,
            playtime2WeeksMin: sql`excluded.playtime_2weeks_min`,
            lastPlayedAt: sql`excluded.last_played_at`,
            syncedAt: sql`excluded.synced_at`,
          },
        });
    }
    await deleteStaleRows(conn, userSteamGamesTable, userId, new Set(gameRows.map((r) => r.steamAppId)));

    const wishlistRows = wishlist.map((entry) => ({
      userId,
      steamAppId: entry.appid,
      gameId: matches.get(entry.appid)?.gameId ?? null,
      name: matches.get(entry.appid)?.name ?? null,
      addedAt: entry.addedAt,
      syncedAt: now,
    }));
    for (const rows of chunk(wishlistRows, DB_INSERT_CHUNK)) {
      await conn
        .insert(userSteamWishlistTable)
        .values(rows)
        .onConflictDoUpdate({
          target: [userSteamWishlistTable.userId, userSteamWishlistTable.steamAppId],
          // importedAt deliberately absent: promotion state survives re-syncs.
          set: {
            gameId: sql`excluded.game_id`,
            name: sql`excluded.name`,
            addedAt: sql`excluded.added_at`,
            syncedAt: sql`excluded.synced_at`,
          },
        });
    }
    await deleteStaleRows(conn, userSteamWishlistTable, userId, new Set(wishlistRows.map((r) => r.steamAppId)));

    await conn
      .update(steamConnectionsTable)
      .set({ ...personaUpdate, syncStatus: "ok", lastSyncedAt: now })
      .where(eq(steamConnectionsTable.userId, userId));

    return {
      status: "ok",
      totalGames: gameRows.length,
      matchedGames: gameRows.filter((r) => r.gameId !== null).length,
      wishlistCount: wishlistRows.length,
    };
  } catch (err) {
    await conn
      .update(steamConnectionsTable)
      .set({ syncStatus: "error", lastSyncedAt: now })
      .where(eq(steamConnectionsTable.userId, userId));
    throw err;
  }
}
