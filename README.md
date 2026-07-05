# Checkpointer (checkpointer.io)

A full-stack application for gaming enthusiasts to track, log, review, and manage their gaming experiences — a web app plus a native mobile companion (`checkpointer-mobile/`), both talking to the same type-safe API. Log play sessions, write reviews, and discover games—all in one place.

## Features

### Core
- **Game Tracking** - Log play sessions with start/end times and current status (playing, finished, stashed)
- **Game Reviews** - Rate games 0-5 stars and write detailed reviews
- **Review Interactions** - View and like other players' reviews
- **Wishlist** - Add games to your want-to-play list
- **Expense Tracking** - Track gaming-related expenses (deprecated — slated for removal)
- **Game Discovery** - Browse and search games from IGDB database (~311k games)
- **Admin Panel** - Manage users, view audit logs, monitor background jobs, and moderate content

### Mobile App (React Native + Expo)
- **The core loop on your phone** - Search the catalog, view game pages, start/stop/log play sessions, manage your wishlist, write and like reviews
- **Library tab** - Playing / Finished / Stashed / Wishlist at a glance
- **Native Kinde login (PKCE)** - Tokens verified server-side against Kinde's JWKS as `Authorization: Bearer`; the web's cookie sessions are untouched
- **Same design language** - The neobrutalist Surface system ported natively (hard offset shadows via RN's CSS boxShadow)
- **End-to-end types** - The app consumes `hc<ApiRoutes>` from the server exactly like the web frontend
- Setup and architecture: see `checkpointer-mobile/README.md`

### Steam Integration
- **Connect Your Steam Account** - Sign in through Steam (OpenID) to link your library
- **Library Sync** - Import your Steam library and playtime, matched against the IGDB catalog
- **Wishlist Import** - Review your Steam wishlist and confirm which games to add to your Checkpointer wishlist
- **Steam Badge** - A badge linking to your Steam profile shown on your public profile header
- **Playtime Chip** - Game pages show your logged Steam playtime when the game is matched in your library
- **Insights** - A Steam-powered breakdown (library size, total playtime, most-played games, hours by genre) in your Insights tab

### Blog Posts
- **Rich Text Editor** - Full TipTap/ProseMirror-powered editor with toolbar (bold, italic, headings, text alignment)
- **Autosave** - Drafts are automatically saved as you write
- **Embed Games & Lists** - Search and embed game cards and game list cards directly into posts
- **Publish / Draft** - Toggle posts between draft and published state; published badge shown on cards
- **Blog Post Cards** - Browse posts with cover previews; post owners see an edit button inline
- **Admin Toggle** - Admins can disable blog posts globally

### Profile Customization
- **Accent Color** - Choose a custom accent color for your public profile
- **Multiple Fonts** - Select from a range of heading and body fonts
- **Background Styles** - Customize profile card backgrounds and inner backgrounds
- **Bio** - Add and display a bio on your public profile
- **Profile Picture** - Upload and sync avatar across the entire UI optimistically

### Game Lists
- **Create & Manage Lists** - Organize games into named lists
- **Public / Private** - Toggle visibility; private lists hidden from other users
- **Reorder Games** - Drag to reorder games within a list
- **Save Count** - List owners can see how many times a list has been saved
- **Homepage Carousel** - Featured lists shown in a tabbed carousel on the homepage

### Social
- **Follow System** - Follow and unfollow other users; view followers and following tabs on profiles
- **Paginated Profile Tabs** - Reviews, lists, and activity tabs with pagination

## Tech Stack

### Backend
- **Bun** - Fast JavaScript runtime
- **Hono** - Lightweight web framework
- **PostgreSQL** - Database (hosted on Neon)
- **Drizzle ORM** - Type-safe database queries and migrations
- **Kinde** - OAuth authentication
- **Cloudflare R2** - Image storage (S3-compatible)
- **Resend** - Transactional emails

### Frontend
- **React 19** - UI framework
- **Vite** - Build tool
- **TanStack Router** - File-based routing
- **TanStack React Query** - Server state management
- **Hono RPC client** - End-to-end type-safe API calls via `hc`
- **TipTap / ProseMirror** - Rich text editor for blog posts
- **Tailwind CSS 4** - Styling
- **Radix UI** - Accessible components
- **TypeScript** - Type safety

### Mobile
- **Expo SDK 57 / React Native** - Managed workflow; Expo Go for development, EAS for builds
- **Expo Router** - File-based navigation (native tabs + stack)
- **NativeWind v4** - Tailwind styling on native
- **TanStack React Query** - Server state, same patterns as web
- **@kinde/expo** - Authorization Code + PKCE login
- **Hono RPC client** - Typed API calls via a type-only `ApiRoutes` import

## Getting Started

### Prerequisites
- Bun runtime installed
- PostgreSQL database (Neon recommended)
- Kinde OAuth application
- Cloudflare R2 bucket
- Resend API key

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd checkpointerv2
   ```

2. **Install dependencies**
   ```bash
   bun install
   cd checkpointer-frontend
   bun install
   cd ..
   ```

3. **Set up environment variables**

   Create a `.env` file in the root directory:
   ```env
   # Kinde OAuth
   KINDE_CLIENT_ID=your_kinde_client_id
   KINDE_CLIENT_SECRET=your_kinde_client_secret
   KINDE_DOMAIN=your_kinde_domain

   # Database
   DATABASE_URL=postgresql://user:password@host:port/database

   # Cloudflare R2
   R2_ACCESS_KEY_ID=your_r2_access_key
   R2_SECRET_ACCESS_KEY=your_r2_secret_key
   R2_BUCKET_NAME=your_bucket_name
   R2_ENDPOINT=your_r2_endpoint

   # IGDB / Twitch (for game sync)
   TWITCH_CLIENT_ID=your_twitch_client_id
   TWITCH_CLIENT_SECRET=your_twitch_client_secret

   # Steam Web API (for Steam integration)
   STEAM_API_KEY=your_steam_web_api_key

   # Email
   RESEND_API_KEY=your_resend_api_key

   # Frontend (in checkpointer-frontend/.env)
   VITE_API_URL=http://localhost:3000
   ```

4. **Run database migrations**
   ```bash
   bun run db:migrate
   ```

5. **Start the development server**

   Backend:
   ```bash
   bun run server/index.ts
   ```

   Frontend (in another terminal):
   ```bash
   cd checkpointer-frontend
   bun run dev
   ```

   Background worker (optional — needed for Steam syncs and scheduled jobs;
   without it, enqueued jobs just wait):
   ```bash
   bun run dev:worker
   ```

   The app will be available at `http://localhost:5173`

6. **Mobile app (optional)** — needs its own Kinde *native* application and a
   `.env`; full instructions in `checkpointer-mobile/README.md`:
   ```bash
   cd checkpointer-mobile
   bun install
   bun run start   # scan the QR with Expo Go (SDK 57)
   ```

## Project Structure

```
checkpointerv2/
├── server/                    # Backend API (Bun + Hono)
│   ├── app.ts                # Main Hono application
│   ├── index.ts              # Server entry point
│   ├── db/                   # Database layer
│   │   ├── schema/           # Drizzle ORM schemas
│   │   └── migrations/       # Database migrations
│   └── routes/               # API endpoints
│       ├── auth.ts           # Authentication routes
│       ├── games.ts          # Game management
│       ├── reviews.ts        # Reviews and ratings
│       ├── game-sessions.ts  # Play session tracking
│       ├── users.ts          # User profiles
│       ├── expenses.ts       # Expense tracking
│       ├── blog-posts.ts     # Blog post CRUD
│       ├── game-lists.ts     # Game list management
│       ├── follows.ts        # Follow/unfollow system
│       ├── settings.ts       # Profile customization settings
│       ├── steam.ts          # Steam connect/sync/library/wishlist
│       ├── insights.ts       # Aggregated profile insights (incl. Steam)
│       └── admin.ts          # Admin operations
│
├── checkpointer-frontend/    # React + Vite frontend
│   ├── src/
│   │   ├── routes/           # TanStack Router pages
│   │   ├── components/       # Reusable React components
│   │   ├── lib/              # API utilities and React Query hooks
│   │   └── main.tsx          # App entry point
│   └── vite.config.ts        # Vite configuration
│
├── checkpointer-mobile/      # React Native + Expo app (own package)
│   ├── src/
│   │   ├── app/              # expo-router routes (tabs + game pages)
│   │   ├── components/       # ui.tsx design system + feature components
│   │   └── lib/              # hc<ApiRoutes> client + React Query hooks
│   ├── patches/              # bun-patched deps (see its README)
│   └── README.md             # Mobile setup, architecture, gotchas
│
├── drizzle/                  # Generated migrations
├── drizzle.config.ts         # Drizzle configuration
├── docs/                     # Plans & audits (mobile-v1-plan, steam, technical-audit)
├── CONTEXT.md                # Domain & architecture glossary
└── package.json              # Dependencies
```

## API Routes

All API endpoints are prefixed with `/api`. Authenticated endpoints accept
either a Kinde cookie session (web) or a Kinde access token as
`Authorization: Bearer` (mobile — verified locally against Kinde's JWKS, see
`server/lib/bearer-auth.ts` and "Bearer auth" in `CONTEXT.md`):

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auth/login` | Initiate OAuth login |
| POST | `/auth/logout` | Logout user |
| GET | `/games` | List games (with pagination/search) |
| GET | `/games/:id` | Get game details |
| POST | `/reviews` | Create a review |
| GET | `/reviews/game/:gameId` | Get reviews for a game |
| GET | `/reviews/user/:userId` | Get user's reviews |
| POST | `/reviews/:id/like` | Like a review |
| DELETE | `/reviews/:id/like` | Unlike a review |
| GET | `/user/profile` | Get current user profile |
| POST | `/user/avatar` | Upload profile avatar |
| POST | `/game-sessions` | Log a play session |
| GET | `/game-sessions/:userId` | Get user's play sessions |
| POST | `/want-to-play` | Add to wishlist |
| DELETE | `/want-to-play/:gameId` | Remove from wishlist |
| POST | `/expenses` | Log an expense |
| GET | `/expenses/:userId` | Get user's expenses |
| GET | `/blog-posts` | List published blog posts |
| POST | `/blog-posts` | Create a new blog post |
| GET | `/blog-posts/:postId` | Get a single blog post |
| PATCH | `/blog-posts/:postId` | Update a blog post |
| DELETE | `/blog-posts/:postId` | Delete a blog post |
| GET | `/game-lists` | Get user's game lists |
| POST | `/game-lists` | Create a game list |
| PATCH | `/game-lists/:listId` | Update a list (name, visibility, order) |
| DELETE | `/game-lists/:listId` | Delete a game list |
| POST | `/follows/:userId` | Follow a user |
| DELETE | `/follows/:userId` | Unfollow a user |
| GET | `/follows/:userId/followers` | Get followers |
| GET | `/follows/:userId/following` | Get following |
| GET | `/settings` | Get user settings |
| PATCH | `/settings` | Update user settings (profile customization) |
| GET | `/steam/connect` | Redirect to Steam OpenID login |
| GET | `/steam/callback` | Verify Steam OpenID callback, link account, trigger first sync |
| GET | `/steam/status` | Get own Steam connection + library stats |
| POST | `/steam/sync` | Manually re-sync Steam library (rate-limited) |
| DELETE | `/steam/connection` | Disconnect Steam and purge the Steam layer |
| GET | `/steam/wishlist/pending` | Get staged Steam wishlist entries awaiting import |
| POST | `/steam/wishlist/import` | Import selected Steam wishlist games into Want to Play |
| GET | `/steam/game/:gameId/playtime` | Get own Steam playtime for a game |
| GET | `/steam/user/:userId/summary` | Get a user's public Steam summary |
| GET | `/steam/user/:userId/library` | Get a user's public Steam library (paginated) |
| GET | `/steam/user/:userId/unmatched` | Get a user's Steam entries with no IGDB match |
| GET | `/insights` | Get aggregated profile insights (gaming, genres, reviews, social, Steam) |
| GET | `/admin/jobs` | List background jobs, dead-letters included (admin; filterable by status) |
| GET | `/admin/jobs/overview` | Queue counts by status, sync checkpoint states, worker liveness (admin) |
| POST | `/admin/jobs/trigger` | Manually enqueue an `igdb-sync` / `prune-jobs` job and kick the worker (admin, audit-logged) |

## Database Schema

**Key Tables:**
- `users` - User accounts and profiles
- `games` - Game catalog from IGDB
- `reviews` - User reviews and ratings
- `review_likes` - Track review likes
- `game_sessions` - Play session logs
- `want_to_play` - Wishlists
- `expenses` - Expense records
- `blog_posts` - User-authored blog posts (draft/published)
- `game_lists` - Named game lists with public/private visibility
- `game_list_items` - Games within a list (with order)
- `follows` - User follow relationships
- `settings` - Per-user profile customization (accent color, fonts, background)
- `steam_connections` - Linked Steam account per user (one Steam account per user)
- `user_steam_games` - Synced Steam library entries with playtime, matched to `games` where possible
- `user_steam_wishlist` - Staged Steam wishlist entries, confirm-to-import into `want_to_play`
- `steam_app_map` - Global Steam appid → IGDB id lookup, refreshed weekly alongside the IGDB sync
- `jobs` - Background job queue; settled rows double as run history and dead-letter records, and carry handler-reported progress
- `audit_logs` - Admin action history (role changes, suspensions, deletions, settings, manual job triggers)

`want_to_play` also has a `source` column (`manual` / `steam`) marking rows promoted from a Steam wishlist import.

## Deployment

The application is configured for deployment on **Fly.io** using Docker.

### Deploy to Fly.io

```bash
fly deploy
```

The included `Dockerfile` builds the backend and is configured to work with Fly.io's container deployment system.

## Development

### Run Tests
```bash
bun test
```
Covers ownership, visibility, images, Steam, the job queue, and bearer auth
(`server/test/bearer-auth.test.ts` signs real JWTs against a local JWKS — no
network).

### Build Frontend
```bash
cd checkpointer-frontend
bun run build
```

### Type-check the Mobile App
```bash
cd checkpointer-mobile
bunx tsc --noEmit
```
This transitively type-checks the server's route files too (via the
`ApiRoutes` import), so it doubles as an API-contract check.

### Lint Code
```bash
bun run lint
```

## IGDB Game Sync

The game catalog is sourced from [IGDB](https://www.igdb.com/) (~311k games). A sync script keeps the database up to date.

### Environment Variables

Requires a [Twitch developer application](https://dev.twitch.tv/console/apps) (IGDB uses Twitch OAuth):

```env
TWITCH_CLIENT_ID=your_twitch_client_id
TWITCH_CLIENT_SECRET=your_twitch_client_secret
```

### Running Manually

```bash
# Auto-detect mode (incremental if last sync succeeded, full otherwise)
bun run sync:igdb

# Force a full import (~311k games, takes hours)
bun run sync:igdb:full

# Steam appid → IGDB id map only (normally rides along after every game sync)
bun run sync:steam-map
```

**Resumability differs by mode.** Full syncs checkpoint their offset after every batch, so a crashed run resumes at the last completed batch. Incremental syncs restart from the top instead: the "updated since" watermark can only advance safely once a whole pass completes (updated games are scattered across the id-ordered pages, so partial progress doesn't correspond to any timestamp cutoff) — a failed incremental redoes its idempotent work rather than risk permanently skipping updates. When the checkpoint state is `failed`, `auto` mode escalates to a full re-import as the guaranteed-correct recovery; the admin panel's trigger buttons pass an explicit mode to override that when you know an incremental retry is enough.

### Automated Sync (background worker)

The background worker (`server/worker.ts`, the `worker` process group on Fly) schedules an `igdb-sync` job every Sunday at 4:00 AM UTC — no CI cron involved. If the worker was down when a run was due, it catches up on boot. Failures retry with backoff and email an alert when retries are exhausted; job history is visible at `GET /api/admin/jobs`.

Jobs belong to the **database**, not to a machine: any worker pointed at the same `DATABASE_URL` (the Fly worker, or a local `bun run dev:worker`) can claim queued work, and the atomic claim guarantees exactly one runs it. The enqueue-time "kick" only wakes the worker co-located with the API you hit (localhost in dev, the Fly-internal worker in production); a missed kick is covered by the 15-minute fallback poll. A locally claimed job runs in the Bun process on that machine — it needs the machine awake until it finishes. If the machine sleeps or the worker dies mid-job, the lease expires and the next available worker reclaims and retries it.

### Monitoring & manual runs (admin panel)

The admin dashboard's **Jobs tab** (`/admin`) is the operational surface:

- **Worker card** — liveness (probed via the worker's `/health` endpoint) and how many interactive/batch jobs it's running.
- **Queue counts** by status (queued / running / succeeded / failed); click to filter the table.
- **Sync state cards** for the IGDB catalog and Steam appid map checkpoints — last run, data watermark, rows processed, resume checkpoint, error text.
- **Job rows** with attempts, lease health for running jobs, next-retry time for backed-off ones, expandable error stack traces, and a **live progress bar** (`done / total` per phase) — handlers report progress at every batch boundary into the `jobs.progress` column, and the tab auto-refreshes every 10s.
- **Manual triggers** for incremental sync, Steam-map-only, full resync, and queue pruning. Triggers are audit-logged (`TRIGGER_JOB`) and deduped: a second click while a manual job of the same type is queued/running is rejected.

Fly's log stream (`fly logs`, or Live Logs in the Fly dashboard) shows what the worker is doing *right now*, but it's ephemeral — the durable answer to "did last week's sync succeed" is the jobs table and checkpoint states, both rendered in this tab.

### How It Works

- **Full sync**: Paginates through all IGDB games (500 per batch), upserts game data and metadata (genres, platforms, keywords, images, links). Progress is checkpointed to the `app_settings` table after each batch.
- **Incremental sync**: Only fetches games updated since the last sync (with a 1-hour buffer). Typically processes a few hundred to a few thousand games.
- **Steam appid map**: After each game sync, a second pass over IGDB's `external_games` endpoint upserts `steam_app_map` (Steam appid → IGDB id), which the Steam integration uses to match imported libraries to the catalog. It keeps its own checkpoint state (`steam_app_map_sync_state`), so a failure there never forces a full game re-sync.
- **Preserved fields**: The sync never overwrites app-managed fields (`rating`, `avgUserRating`, `userReviewCount`). Only IGDB-sourced fields are updated.

### Neon Database Notes

When running against Neon, use the **direct** (non-pooler) connection string. The pooler connection drops long-lived connections. The sync script configures its own DB client with TCP keepalive to prevent disconnects.

## Frontend Patterns

### Profile Theming

Profile pages support full visual customization (font family, font color, accent color, card backgrounds). The theming helpers live in `checkpointer-frontend/src/lib/profileTheme.ts`.

#### Applying theming to a new profile page

Two helpers apply theming to the two distinct zones:

```tsx
import {
  getProfileContentStyle,
  getProfileHeaderStyle,
} from "@/lib/profileTheme";

// Content container — must also have the `profile-themed-content` class
<div
  className="profile-themed-content ..."
  style={getProfileContentStyle(theme)}
>
  {/* Header banner */}
  <div style={getProfileHeaderStyle(theme, "rgb(96 165 250 / 0.4)")}>
    ...
  </div>

  {/* Rest of page content */}
</div>
```

| Helper | Sets | Used on |
|---|---|---|
| `getProfileContentStyle(theme)` | Background color, font family, font size, `--foreground`, `--muted-foreground`, `--card`, `--popover`, etc. | Outermost content container |
| `getProfileHeaderStyle(theme, fallbackBg)` | Background color, `--foreground`/`--muted-foreground` scoped to header | Header banner element only |

The `fallbackBg` argument to `getProfileHeaderStyle` is used when the user hasn't set a custom header color.

> **Important:** The `profile-themed-content` class **must** be on the content container for the `profile-accent` and `profile-card` utility classes to work. Those classes are CSS-scoped to `.profile-themed-content .profile-accent` and `.profile-themed-content .profile-card`, so they have no effect outside of it.

#### Opting specific components out of theming — `ResetProfileTheme`

Some components inside the profile page should **not** inherit certain theme properties. For example, chart tooltips should always have readable text even if the user chose a white `contentFontColor`, and code blocks should use a monospace font regardless of the user's chosen font family.

Some components inside the profile page should **not** inherit certain theme properties. For example, chart tooltips should always have readable text even if the user chose a white `contentFontColor`, and code blocks should use a monospace font regardless of the user's chosen font family.

Use `ResetProfileTheme` (`src/components/profile/ResetProfileTheme.tsx`) to selectively opt out of specific properties:

```tsx
import { ResetProfileTheme } from "@/components/profile/ResetProfileTheme";

// Reset color variables only (default) — tooltip use case
<ResetProfileTheme>
  <MyComponent />
</ResetProfileTheme>

// Reset font family only — keep theme colors, switch back to system font
<ResetProfileTheme colors={false} font>
  <code>...</code>
</ResetProfileTheme>

// Reset both colors and font
<ResetProfileTheme font>
  <MyComponent />
</ResetProfileTheme>
```

| Prop | Default | Effect |
|---|---|---|
| `colors` | `true` | Resets `--foreground`, `--background`, `--muted-foreground`, etc. to light-mode defaults |
| `font` | `false` | Resets `font-family` to `system-ui, sans-serif` |

Note: `font-family` is applied as an inline style (not a CSS variable), so it continues to cascade unless explicitly overridden with `font`. The `colors` prop has no effect on font family.

For **Recharts tooltips**, use the function form of the `content` prop so recharts data props flow through correctly:

```tsx
<ChartTooltip
  content={(props) => (
    <ResetProfileTheme>
      <ChartTooltipContent {...props} />
    </ResetProfileTheme>
  )}
/>
```

## Performance Optimizations

- Profile tabs optimized for faster rendering
- Avatar images compressed before upload to R2
- Debounced search for game discovery
- Cached queries with Tanstack React Query
- Lazy loading on paginated routes
- Browse page prefetches the next results page (eagerly once the current page settles, and on pagination-control hover/focus intent) so paging forward resolves from cache
- Skeletons mirror real card layouts (browse grid, game cards) for zero layout shift while loading
- No-cover game art falls back to an inline data-URI placeholder instead of a network-fetched asset, avoiding a slow uncached round trip

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Create a feature branch (`git checkout -b feature/your-feature`)
2. Make your changes
3. Test thoroughly
4. Create a pull request with thorough description

## License

[Add your license here]

## Support

For issues, questions, or feature requests, please:
- Open an issue on GitHub
- Email support@checkpointer.io
