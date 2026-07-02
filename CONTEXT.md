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

## Surface (frontend)

The one owner of the neobrutalist card/panel look: the `.surface` class in
`checkpointer-frontend/src/index.css` (bg `--card`, 4px `--border` border,
square corners, hard offset shadow). `ui/card.tsx` and `ui/dialog.tsx` are
built on it. The shadow is tokenized: `--shadow-color` (flips with `.dark`)
feeds `shadow-hard-1/2/3/4/6/8` utilities — call sites never write a `dark:`
shadow twin. `shadow-soft-*` is the deliberately-quieter variant (same color
both modes, e.g. the outline button). Restyling the look = editing `index.css`.

## Brand palettes (frontend)

Components never use Tailwind's named palette for the app's warm identity —
they use the aliases defined in `index.css`: **`brand-*`** (the base family,
currently amber) and **`pop-*`** (the louder highlight family, currently
orange). Reskinning the app = re-pointing those ~22 values in one file.
`primary`/`secondary`/`card`/etc. remain the shadcn semantic tokens.
