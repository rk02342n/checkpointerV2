import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { errorHandler } from './lib/errors'
import { expensesRoute } from './routes/expenses'
import { serveStatic } from 'hono/bun'
import { authRoute } from './routes/auth'
import { gamesRoute } from './routes/games'
import { reviewsRoute } from './routes/reviews'
import { usersRoute } from './routes/users'
import { adminRoute } from './routes/admin'
import { gameSessionsRoute } from './routes/game-sessions'
import { contactRoute } from './routes/contact'
import { wantToPlayRoute } from './routes/want-to-play'
import { gameListsRoute } from './routes/game-lists'
import { settingsRoute } from './routes/settings'
import { followsRoute } from './routes/follows'
import { blogPostsRoute } from './routes/blog-posts'
import { insightsRoute } from './routes/insights'

const app = new Hono()

app.use('*', logger())

app.use('*', cors({
  origin: [
    'http://localhost:5173',
    'https://checkpointer.io',
    'https://www.checkpointer.io',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}))

app.use('*', csrf())

const apiRoutes = app
  .basePath("/api")
  .route("/expenses", expensesRoute)
  .route("/", authRoute)
  .route("/games", gamesRoute)
  .route("/reviews", reviewsRoute)
  .route("/user", usersRoute)
  .route("/admin", adminRoute)
  .route("/game-sessions", gameSessionsRoute)
  .route("/contact", contactRoute)
  .route("/want-to-play", wantToPlayRoute)
  .route("/game-lists", gameListsRoute)
  .route("/settings", settingsRoute)
  .route("/follows", followsRoute)
  .route("/blog-posts", blogPostsRoute)
  .route("/insights", insightsRoute);

// The error-handler seam: one place where a thrown error becomes a response.
// Throwers like notFound()/forbidden() (server/lib/errors.ts) render here into
// the app's `{ error }` shape; anything else is a logged 500.
app.onError(errorHandler)

app.use('*', serveStatic({ root: './checkpointer-frontend/dist' }))  // change path accordingly to point to dist folder in frontend
app.get('*', serveStatic({ path: './checkpointer-frontend/dist/index.html' })) // change path accordingly

export default app
export type ApiRoutes = typeof apiRoutes;