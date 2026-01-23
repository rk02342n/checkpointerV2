import { Hono } from "hono";
import { zValidator } from '@hono/zod-validator'
import { getAuthUser } from "../kinde"; // pass in getAuthUser as middleware function to make the route authenticated
import { db } from "../db";
import { expensesTable, expensesInsertSchema } from "../db/schema/expenses";
import { eq, desc, sum, and } from "drizzle-orm";

import { createExpenseSchema } from "../sharedTypes";

// type Expense = {
//     id: number,
//     title: string,
//     amount: number,
// }

// const fakeExpenses: Expense[] = [
//     {id: 1, title: "Groceries", amount: "50"},
//     {id: 2, title: "Utilities", amount: "100"},
//     {id: 3, title: "Rent", amount: "1500"}
// ]

export const expensesRoute = new Hono()
.get("/", getAuthUser, async (c) => {
    const user = c.var.user // we can grab the user like this
    const expenses = await db.select()
    .from(expensesTable)
    .where(eq(expensesTable.userId, user.id))
    .limit(100) // for pagination
    .orderBy(desc(expensesTable.createdAt))
    return c.json({ expenses: expenses })
})
.post("/", zValidator("json", createExpenseSchema), getAuthUser, async c => { // zValidator middleware validation function
    const user = c.var.user
    const expense = await c.req.valid("json");
    const validatedExpense = expensesInsertSchema.parse({
        ...expense,
        userId: user.id,
    })

    const result = await db
    .insert(expensesTable)
    .values(validatedExpense)
    .returning()
    .then(res => res[0]);
    // fakeExpenses.push({...expense, id: fakeExpenses.length + 1});
    c.status(201)
    return c.json(result);
})
.get("/total-spent", getAuthUser, async c => {
    // Calculate the total amount from all expenses
    // add a fake delay to test loading feature in frontend - needs to make function async for it
    // await new Promise((r) => setTimeout(r, 2000))
    const user = c.var.user
    // const total = fakeExpenses.reduce((sum, expense) => sum + +expense.amount, 0);
    const result = await db.select({ total: sum(expensesTable.amount) })
        .from(expensesTable)
        .where(eq(expensesTable.userId, user.id))
        .limit(1)
        .then(res => res[0]) // db commands always return an array sowe have to convert it into just the first element
    return c.json(result);
})
.get("/:id{[0-9]+}", getAuthUser, async c => {  // regex makes sure we get a number as a request
    // const id = Number.parseInt(c.req.param('id'))
    // const expense = fakeExpenses.find(expense => expense.id === id)

    const id = Number.parseInt(c.req.param('id'))
    const user = c.var.user // we can grab the user like this

    const expense = await db
    .select()
    .from(expensesTable)
    .where(and(eq(expensesTable.userId, user.id), eq(expensesTable.id, id)))
    .then(res => res[0])
     if (!expense){
        return c.notFound();
    }
    return c.json({ expense })

})
.delete("/:id{[0-9]+}", getAuthUser, async c => {  // regex makes sure we get a number as a request
    const id = Number.parseInt(c.req.param('id'))
    const user = c.var.user // we can grab the user like this

    // const expense = fakeExpenses.splice(index, 1)[0];
    const expense = await db
    .delete(expensesTable)
    .where(and(eq(expensesTable.userId, user.id), eq(expensesTable.id, id)))
    .returning()
    .then(res => res[0])
    
    if (!expense){
        return c.notFound();
    }
    return c.json({expense: expense})

})
