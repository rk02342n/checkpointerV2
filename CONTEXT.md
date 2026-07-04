# Checkpointer — Domain & Architecture Glossary

A game-logging social app (Letterboxd for games). This file gives names to the
seams and concepts the codebase is built around, so design discussions and
future architecture reviews share one vocabulary. Architecture terms (module,
interface, depth, seam, adapter, leverage, locality) come from the
`/codebase-design` skill and are used here exactly.

## Domain concepts

- **Game** — a title in the catalogue, synced from IGDB. Assembled for reads
  with its related images, platforms, genres, keywords, and links.
- **Game list** — a user-curated, ordered collection of games (`game_lists` +
  `game_list_items`). Owned by one user.
- **Review** — a user's rating + text for a game. Owned by one user.
- **Blog post** — long-form user content with embedded game/list references.
  Owned by one user.
- **Game session** — a user's play record for a game (playing / finished /
  stashed). Owned by one user.

## Owned resource

A row that belongs to exactly one user via a `userId` column and is addressed by
its own `id`. The four owned-resource tables are `game_lists`, `blog_posts`,
`reviews`, and `game_sessions` — each has `id` (uuid PK) + `userId` (uuid).

Mutating an owned resource requires an **ownership check**: confirm the row
exists *and* belongs to the caller before acting. "Exists but not yours" is
treated as **404**, identical to "does not exist" — the seam never reveals the
existence of another user's resource. (Role/permission denials are a *different*
seam and stay **403** — see `requireRole` in `server/kinde.ts`.)

Tables keyed by a composite `(userId, …)` — `want_to_play`, review-likes,
follows — are **not** owned resources. They are "my rows" collections (no single
resource `id`); the ownership module does not cover them.

### The ownership module (`assertOwned` / `loadOwned` / `ownerScope`)

The deep module behind the owned-resource seam. One predicate, three uses:

- **`ownerScope(table, id, userId)`** — the shared primitive: the Drizzle
  predicate `and(eq(table.id, id), eq(table.userId, userId))`. Lets owner-scoped
  *writes* (`db.delete(t).where(ownerScope(...))`) keep their single-query shape.
- **`loadOwned(table, id, userId, conn?)`** — runs the scoped select, returns
  `row | undefined`. For the rare site that branches on absence without throwing.
- **`assertOwned(table, id, userId, conn?)`** — the default. Returns the row, or
  throws `notFound()` (→ rendered 404). Removes both the duplicated query *and*
  the `if (!x) return c.json(…404)` guard from handlers.

`conn` defaults to the `db` singleton; tests pass a scratch connection. Nested
ownership (e.g. adding an item to a list) checks the **parent** resource:
`assertOwned(gameListsTable, listId, userId)`.

## Error-handler seam

A single `app.onError` is the one place where a thrown error becomes an HTTP
response. `assertOwned` is its first caller, via small typed throwers
(`notFound`, `forbidden`) built on Hono's `HTTPException`. The rendered body
keeps the existing `{ error: string }` shape.

This seam is the **seed** of standardized error handling: over time the ~37
manual `return c.json({ error }, code)` guards can migrate to throws. A
machine-readable `code` field (`{ error, code }`) is deferred until a frontend
needs to switch on it.

## Viewer

The identity behind *optional* auth on public reads: `getOptionalViewer` in
`server/kinde.ts` resolves the session to the caller's `dbUser` or `null`
(anonymous). It never 401s and never creates users, unlike `getAuthUser`.
Consumers: draft/private image serving, profile visibility, `userLiked` on
game-page reviews.

## Image-visibility rule

Serving a stored image is gated by the *resource* it belongs to: a blog post's
header/inline images are public once the post is **published**, owner-only
while **draft**; a game list's cover follows the list's visibility (private →
owner only); avatars and profile gifs are always public (identity). Keys are
**DB-derived or prefix-scoped** (`blog-images/<postId>/…`) — a route must never
pass a raw client-supplied key to the bucket. `streamR2Image`
(`server/lib/images.ts`) is the one streaming adapter behind all five serving
routes; visibility decisions stay in the routes (they differ per resource).

## Profile visibility

`users.isPublic = false` means **full private** (Letterboxd-style): identity
(username, avatar, gif) stays resolvable, but activity — sessions,
want-to-play, follows, reviews-by-user — is owner-only and renders **404**,
matching the owned-resource convention. Reviews by private users are also
excluded from game-page feeds. There is no followers-only tier: follows have no
approval step, so it would gate nothing. The module is
`server/lib/visibility.ts`: `canViewProfile` (predicate),
`assertViewableProfile` (guard for `/user/:userId/...` reads),
`visibleUsersScope` (join filter for multi-user feeds).

## Steam integration

Steam data lives in its own layer — `steam_connections`, `user_steam_games`,
`user_steam_wishlist` — and never synthesizes `game_sessions` rows. Playtime is
observational data, not a substitute for a user-logged play session; the two
stay separate by design.

`steam_app_map` (`steamAppId → igdbId`) is the global bridge between Steam's
catalog and IGDB's, seeded and refreshed weekly as a step in the IGDB sync (see
README's "IGDB Game Sync"). Library/wishlist entries with no map hit are
stored anyway (nullable `gameId`) rather than dropped, and surfaced separately
in the UI as unmatched — a later IGDB sync can retro-match them without
re-importing.

The sync engine, `syncSteamUser` (`server/lib/steam.ts`), is a single
idempotent function: fetch summary + owned games + wishlist, upsert, delete
what's gone. It runs on the background worker as a `steam-sync` job (see
Background jobs below) — the connect callback and `POST /api/steam/sync` only
enqueue (deduped per user) and return; the profile polls
`steam_connections.syncStatus` (`pending` = job queued/running) until it
settles. The 10-minute cooldown is enforced at enqueue time in the route, not
inside the function itself, so the initial connect-callback sync always fires
regardless of cooldown state.

Connect uses Steam OpenID 2.0, not OAuth: `buildSteamLoginUrl` builds the
"Sign in through Steam" redirect, and `verifySteamOpenId` never trusts the
callback params directly — it echoes them back to Steam's
`check_authentication` endpoint and only proceeds on Steam's own
`is_valid:true`. `steamId64` is extracted from `claimed_id` with a strict
pattern match so a forged callback pointing at a non-Steam URL is rejected.

The Steam wishlist is confirm-to-import, mirroring the app's general
preference for explicit user action over silent merges: entries are staged in
`user_steam_wishlist` and only promoted into `want_to_play` (tagged
`source: 'steam'`, alongside the existing `source: 'manual'` rows) when the
user explicitly selects them. Re-syncing never re-adds a game the user removed
from `want_to_play` after import.

Visibility follows the existing seam — no separate Steam toggle. Public reads
go through `assertViewableProfile` (see Profile visibility above), so a
private profile's Steam data is gated exactly like its sessions and reviews.

## Background jobs

Async work runs through a `jobs` table in the app database (`server/lib/queue.ts`)
claimed with `FOR UPDATE SKIP LOCKED` — no Redis, no external queue vendor.
The worker (`server/worker.ts`, the `worker` process group in fly.toml, same
image as the web app) claims in two lanes so the multi-hour weekly IGDB catalog
sync can never starve user-facing Steam syncs. Wake-up is kick-driven: the API
pokes the worker over Fly's private network right after an enqueue
(`server/lib/kick.ts`), with a slow fallback poll as the safety net so Neon can
autosuspend when idle.

Lifecycle contract: retries with exponential backoff reuse the same row; a job
that exhausts `maxAttempts` stays as its own dead-letter record (visible at
`GET /api/admin/jobs`, alerted via Resend — `server/lib/alerts.ts`). Claims
carry a heartbeated lease, so a crashed worker's jobs get reclaimed rather than
lost. Recurring work (weekly IGDB sync, daily prune) is declared in
`SCHEDULES` in the worker with per-occurrence dedupe keys — this replaced the
GitHub Actions cron, and catch-up after downtime is automatic. The enqueue-side
dedupe (partial unique index on active jobs only) is a different mechanism from
the scheduler's any-status existence check; don't conflate them.

## Surface (frontend)

The one owner of the neobrutalist card/panel look: the `.surface` class in
`checkpointer-frontend/src/index.css` (bg `--card`, **no border** — shadow-only,
`border-radius: 0.65rem` soft-rounded corners, hard offset shadow). `ui/card.tsx`
and `ui/dialog.tsx` are built on it. The shadow is tokenized: `--shadow-color`
(flips with `.dark`) feeds `shadow-hard-1/2/3/4/6/8` utilities — call sites
never write a `dark:` shadow twin. `shadow-soft-*` is the deliberately-quieter
variant (same color both modes, e.g. the outline button). Restyling the look =
editing `index.css`.

**Border convention** (two tiers, solidified in the border-4 removal sweep):
surfaces, buttons, and dropdown panels are shadow-only with no border at all;
inputs, avatars, toggles, badges, and thumbnail chips use `border-2 border-border`.
`border-4` no longer appears anywhere as a border width except the logo
checkerboard motif and spinner geometry (`border-4 ... border-t-transparent`,
which is drawing, not a panel border). Exception: the profile sidebar tab
pills (`ProfileTabSidebar`) and the profile header stat boxes intentionally
stay square — `shadow-hard-3`, no border, not `.surface`.

`rounded-t-[0.65rem]` is hand-matched to `.surface`'s radius at several call
sites (game cover images, skeleton cards) since it isn't sourced from a shared
token — changing `.surface`'s radius means updating those call sites too.

Dropdown/popover panels (`DropdownMenuContent`) always set an explicit
`bg-card`/`bg-muted` rather than inheriting one, and use `pop-200`/`pop-900`
for menu-item hover/focus rather than `primary/20` — same "always use
`brand-*`/`pop-*`, never a raw default" rule as Brand palettes below, applied
to backgrounds and interaction states, not just accents.

Profile theming plugs into three CSS variables at the bottom of `index.css`:
`--profile-card-bg`, `--profile-accent`, `--profile-accent-font`, consumed by
the `.profile-card` / `.profile-accent` / `.profile-accent-muted` utility
classes. `Navbar` accepts an `accentColor` prop wired from
`profileTheme.accentColor` on the owner's themed profile route
(`routes/_authenticated/profile.tsx`) so the nav bar itself picks up the
user's accent color; the public profile route doesn't wire this yet.

## Brand palettes (frontend)

Components never use Tailwind's named palette for the app's warm identity —
they use the aliases defined in `index.css`: **`brand-*`** (the base family,
currently amber) and **`pop-*`** (the louder highlight family, currently
orange). Reskinning the app = re-pointing those ~22 values in one file.
`primary`/`secondary`/`card`/etc. remain the shadcn semantic tokens.

## Browse prefetching (frontend)

`routes/_authenticated/browse.tsx` prefetches results via imperative React
Query (`queryClient.prefetchQuery`), not TanStack Router loaders. The next
page prefetches eagerly once the current page's data has settled, and again
on 120ms hover/focus-intent over pagination controls
(`components/BrowsePagination.tsx`) — both call the same `prefetchPage`
helper, so paging forward is the common case that resolves from cache with no
skeleton flash. Skeletons (`components/custom-skeletons/BrowseGamesSkeleton.tsx`)
mirror the real card layout exactly, for zero layout shift when data lands.

The no-cover game placeholder (`lib/placeholderCover.ts`) is an inline
data-URI SVG, not a fetched asset — the prior `/bitmap.svg` static file was
served `no-cache`, so it forced a network round trip on every render and
became the slowest image on the page despite being the "cheap" fallback.
