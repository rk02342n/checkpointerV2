# Checkpointer (checkpointer.io)

A full-stack web application for gaming enthusiasts to track, log, review, and manage their gaming experiences. Log play sessions, write reviews, track expenses, and discover games—all in one place.

## Features

### Core
- **Game Tracking** - Log play sessions with start/end times and current status (playing, finished, stashed)
- **Game Reviews** - Rate games 0-5 stars and write detailed reviews
- **Review Interactions** - Like and comment on other players' reviews
- **Wishlist** - Add games to your want-to-play list
- **Expense Tracking** - Track gaming-related expenses and view total spending
- **Game Discovery** - Browse and search games from IGDB database (~311k games)
- **Admin Panel** - Manage users, view audit logs, and moderate content

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

   The app will be available at `http://localhost:5173`

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
├── drizzle/                  # Generated migrations
├── drizzle.config.ts         # Drizzle configuration
└── package.json              # Dependencies
```

## API Routes

All API endpoints are prefixed with `/api`:

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
- `audit_logs` - Admin action history

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

### Build Frontend
```bash
cd checkpointer-frontend
bun run build
```

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

# Force a full import (~311k games, ~20-30 min)
bun run sync:igdb:full
```

The sync is resumable — if it crashes or the connection drops, re-running `bun run sync:igdb` picks up from the last checkpoint.

### Automated Sync (GitHub Actions)

A weekly cron job runs every Sunday at 4:00 AM UTC via `.github/workflows/igdb-sync.yml`. It can also be triggered manually from the GitHub Actions tab with a mode selector (auto/full/incremental).

**Required repository secrets:** `DATABASE_URL`, `TWITCH_CLIENT_ID`, `TWITCH_CLIENT_SECRET`

### How It Works

- **Full sync**: Paginates through all IGDB games (500 per batch), upserts game data and metadata (genres, platforms, keywords, images, links). Progress is checkpointed to the `app_settings` table after each batch.
- **Incremental sync**: Only fetches games updated since the last sync (with a 1-hour buffer). Typically processes a few hundred to a few thousand games.
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
