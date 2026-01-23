import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { getAuthUser } from "../kinde"; // pass in getUser as middleware function to make the route authenticated
import { db } from "../db";
import { expensesTable, expensesInsertSchema } from "../db/schema/expenses";
import { gamesTable, gamesInsertSchema, gamesSelectSchema, gameParamsSchema } from "../db/schema/games";
import { usersTable } from "../db/schema/users";
import { eq, desc, sum, and, ilike, or } from "drizzle-orm";

export const usersRoute = new Hono()

.get("/account", getAuthUser, async c => {
    // regex makes sure we get a number as a request
    // const id = Number.parseInt(c.req.param('id'))
    const authUser = c.var.user
    // const kindeid = 'kp_c71a3c8c7b11484e9b8f9009b690cd4d'
    const account = await db
    .select()
    .from(usersTable)
    .where(and(eq(usersTable.kindeId, authUser.id)))
    // .where(and(eq(usersTable.kindeId, kindeid)))
    .limit(1)
    .then(res => res[0])
     if (!account){
        return c.notFound();
    }
    return c.json({ account })
})
// .post("/", zValidator("json", createExpenseSchema), getUser, async c => { // zValidator middleware validation function
//     const user = c.var.user
//     const expense = await c.req.valid("json");
//     const validatedExpense = expensesInsertSchema.parse({
//         ...expense,
//         userId: user.id,
//     })

//     const result = await db
//     .insert(expensesTable)
//     .values(validatedExpense)
//     .returning()
//     .then(res => res[0]);
//     c.status(201)
//     return c.json(result);
// })
// .get("/total-spent", getUser, async c => {
//     // add a fake delay to test loading feature in frontend - needs to make function async for it
//     // await new Promise((r) => setTimeout(r, 2000))
//     const user = c.var.user
//     const result = await db.select({ total: sum(expensesTable.amount) })
//         .from(expensesTable)
//         .where(eq(expensesTable.userId, user.id))
//         .limit(1)
//         .then(res => res[0]) // db commands always return an array sowe have to convert it into just the first element
//     return c.json(result);
// })

// })
// .delete("/:id{[0-9]+}", getUser, async c => {  // regex makes sure we get a number as a request
//     const id = Number.parseInt(c.req.param('id'))
//     const user = c.var.user // we can grab the user like this
//     const expense = await db
//     .delete(expensesTable)
//     .where(and(eq(expensesTable.userId, user.id), eq(expensesTable.id, id)))
//     .returning()
//     .then(res => res[0])
    
//     if (!expense){
//         return c.notFound();
//     }
//     return c.json({expense: expense})

// })
