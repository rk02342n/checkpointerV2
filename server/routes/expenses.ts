import { Hono } from "hono";
import z from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getUser } from "../kinde"; // pass in getUser as middle function to make the route authenticated


const expenseSchema = z.object({
    id: z.number().int().positive().min(1),
    title: z.string().min(3).max(100),
    amount: z.number().int().positive(),
})

// type Expense = {
//     id: number,
//     title: string,
//     amount: number,
// }

type Expense = z.infer<typeof expenseSchema> // we already have a zod schema validator which we can use to create the type

const createPostSchema = expenseSchema.omit({id: true}) // makes a zod schema for post becuase we do not need an id in the request

const fakeExpenses: Expense[] = [
    {id: 1, title: "Groceries", amount: 50},
    {id: 2, title: "Utilities", amount: 100},
    {id: 3, title: "Rent", amount: 1500}
]

export const expensesRoute = new Hono()
.get("/", getUser, (c) => {
    const user = c.var.user // we can grab the user like this
    return c.json({ expenses: fakeExpenses })
})
.post("/", zValidator("json", createPostSchema), getUser, async c => { // zValidator middleware validation function
    const data = await c.req.valid("json");
    const expense = createPostSchema.parse(data)
    fakeExpenses.push({...expense, id: fakeExpenses.length + 1});
    c.status(201)
    return c.json(expense);
})
.get("/total-spent", getUser, async c => {
    // Calculate the total amount from all expenses
    // add a fake delay to test loading feature in frontend - needs to make function async for it
    await new Promise((r) => setTimeout(r, 2000))
    const total = fakeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    return c.json({ total });
})
.get("/:id{[0-9]+}", getUser, c => {  // regex makes sure we get a number as a request
    const id = Number.parseInt(c.req.param('id'))
    const expense = fakeExpenses.find(expense => expense.id === id)
    if (!expense){
        return c.notFound();
    }
    return c.json({expense})
})
.delete("/:id{[0-9]+}", getUser, c => {  // regex makes sure we get a number as a request
    const id = Number.parseInt(c.req.param('id'))
    const index = fakeExpenses.findIndex(expense => expense.id === id)
    if (index === -1){
        return c.notFound();
    }
    const deletedExpense = fakeExpenses.splice(index, 1)[0];
    return c.json({expense: deletedExpense});
})



