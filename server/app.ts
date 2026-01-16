import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { expensesRoute } from './routes/expenses'
import { serveStatic } from 'hono/bun'

const app = new Hono()

app.use('*', logger())

app.get('/test', c => {
    return c.json({
        "message": "test"
    })
})

const apiRoutes = app.basePath("/api").route("/expenses", expensesRoute)

app.use('*', serveStatic({ root: './checkpointer-frontend/dist' }))  // change path accordingly to point to dist folder in frontend
app.get('*', serveStatic({ path: './checkpointer-frontend/dist/index.html' })) // change path accordingly

export default app
export type ApiRoutes = typeof apiRoutes;