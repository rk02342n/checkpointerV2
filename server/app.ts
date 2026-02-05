import { Hono } from 'hono'
import { logger } from 'hono/logger'
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

const app = new Hono()

app.use('*', logger())

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
  .route("/settings", settingsRoute);

app.use('*', serveStatic({ root: './checkpointer-frontend/dist' }))  // change path accordingly to point to dist folder in frontend
app.get('*', serveStatic({ path: './checkpointer-frontend/dist/index.html' })) // change path accordingly

export default app
export type ApiRoutes = typeof apiRoutes;