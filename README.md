# Checkpointer (checkpointer.io)

A full-stack web application for gaming enthusiasts to track, log, review, and manage their gaming experiences. Log play sessions, write reviews, track expenses, and discover games—all in one place.

## Features

- **Game Tracking** - Log play sessions with start/end times and current status (playing, finished, stashed)
- **Game Reviews** - Rate games 0-5 stars and write detailed reviews
- **Review Interactions** - Like and comment on other players' reviews
- **User Profiles** - Customize your profile with avatar, bio, and display name
- **Wishlist** - Add games to your want-to-play list
- **Expense Tracking** - Track gaming-related expenses and view total spending
- **Game Discovery** - Browse and search games from IGDB database
- **Admin Panel** - Manage users, view audit logs, and moderate content

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

## Database Schema

**Key Tables:**
- `users` - User accounts and profiles
- `games` - Game catalog from IGDB
- `reviews` - User reviews and ratings
- `review_likes` - Track review likes
- `game_sessions` - Play session logs
- `want_to_play` - Wishlists
- `expenses` - Expense records
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
