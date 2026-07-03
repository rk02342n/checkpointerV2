# Steam Integration Plan

Status: agreed via design grilling, 2026-07-03. Not yet implemented.

## Decisions (agreed)

| Decision | Choice |
|---|---|
| Sync model | Connect + manual "Sync now"; architecture must support cron auto-sync later |
| Connect flow | Steam OpenID 2.0 (verified ownership), web app only; mobile only views data |
| Playtime mapping | Separate Steam layer — `game_logs` stays 100% human-authored, no synthetic sessions |
| Unmatched games | Store all entries (nullable gameId); UI shows matched only + "N unmatched" note; retro-match as IGDB sync fills gaps |
| v1 scope | Library + playtime, Steam wishlist, profile info (persona/avatar). Achievements deferred |
| Wishlist merge | Confirm-to-import: Steam wishlist stored in layer, user explicitly promotes into `want_to_play` (rows tagged `source='steam'`); re-sync never re-adds removed games |
| Profile UI | New "Steam" tab in profile sidebar + Insights integration |
| Visibility | Steam data follows existing profile visibility (`users.isPublic`); no separate toggle |
| Disconnect | Purge steamId + entire Steam layer; keep user-confirmed `want_to_play` imports |
| Reach in v1 | Insights stats, game-page "your Steam playtime", Steam badge on profile header |

## Technical decisions (implementer's call, stated for the record)

- **`STEAM_API_KEY`** env var (Steam Web API key, 100k calls/day budget).
- **`steam_connections` table** (separate from `users`): `userId` (unique, FK cascade), `steamId64` (unique — one Steam account per Checkpointer user), `personaName`, `avatarUrl`, `profileUrl`, `lastSyncedAt`, `syncStatus`, `createdAt`.
- **`user_steam_games` table**: `userId`, `steamAppId`, `name`, `gameId` (nullable FK → games), `playtimeForeverMin`, `playtime2WeeksMin`, `lastPlayedAt`, `syncedAt`. PK `(userId, steamAppId)`. Upsert on sync; delete rows missing from latest sync (games can't leave a Steam library, but family-sharing artifacts can).
- **`user_steam_wishlist` table**: `userId`, `steamAppId`, `name`, `gameId` (nullable), `addedAt` (Steam-side), `syncedAt`, `importedAt` (null until promoted).
- **`want_to_play.source` column**: enum/text default `'manual'`, `'steam'` for promoted rows.
- **Appid → IGDB matching**: new `steam_app_map` table (`steamAppId` PK, `igdbId`) seeded from IGDB `external_games` (external_game_source = 1/Steam) as a new step in the existing weekly IGDB sync script; backfilled/validated against Steam URLs already in `game_links`. Match at sync time by joining through `games.igdbId`; a periodic re-match pass links previously unmatched rows.
- **Sync execution**: one idempotent `syncSteamUser(userId)` function in `server/lib/steam.ts`, called synchronously from `POST /api/steam/sync` (GetOwnedGames + GetWishlist + GetPlayerSummaries = 3 Steam calls + upserts; fast enough inline). Cooldown ~10 min enforced via `lastSyncedAt`. Future cron calls the same function.
- **OpenID routes**: `GET /api/steam/connect` (redirect to Steam with return_to) and `GET /api/steam/callback` (verify `openid.mode=check_authentication` round-trip against `steamcommunity.com/openid/login`, extract steamId64 from claimed_id, require an authenticated Kinde session, store connection, kick off first sync, redirect to profile Steam tab). No extra OpenID library needed — the verification round-trip is a single form-encoded POST.
- **Private Steam libraries**: GetOwnedGames returns an empty response for private game details. Detect (empty `games` on first sync) and surface a clear error with a link to Steam privacy settings; store `syncStatus='private_profile'`.
- **Read API**: `GET /api/steam/library` (paginated, playtime-desc, matched games joined with cover/name), `GET /api/steam/status` (connection + persona + counts + unmatched count + wishlist-pending count), `GET /api/steam/wishlist/pending`, `POST /api/steam/wishlist/import` (appids[] → want_to_play with source='steam'), `DELETE /api/steam/connection`. Public profile endpoints reuse existing visibility checks (`server/lib/visibility.ts`).
- **Frontend**: Hono RPC (`hc`) clients per existing convention (`import type` for server types; handle isPending/isError/data). New `steamQuery.ts` lib, Steam tab in `profile.tsx` + public `users/$userId` profile, connect CTA when unconnected, game-page playtime chip, Insights additions, header badge.

## Build order

1. Migration: new tables + `want_to_play.source` (drizzle-kit generate + **migrate**, never push).
2. `server/lib/steam.ts`: Web API client, OpenID verify, `syncSteamUser`.
3. `steam_app_map` seeding step in the IGDB sync script.
4. Routes: connect/callback/status/sync/library/wishlist/disconnect.
5. Frontend: connect flow + Steam tab (own profile), then public profile tab.
6. Wishlist confirm-to-import UI.
7. Insights + game-page playtime + header badge.
8. Later (out of v1): cron auto-sync reusing `syncSteamUser`, achievements.
