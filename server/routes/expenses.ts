import { Hono } from "hono";
import z from 'zod'
import { zValidator } from '@hono/zod-validator'



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
.get("/", (c) => {
    return c.json({ expenses: fakeExpenses })
})
.post("/", zValidator("json", createPostSchema), async c => { // zValidator middleware validation function
    const data = await c.req.valid("json");
    const expense = createPostSchema.parse(data)
    fakeExpenses.push({...expense, id: fakeExpenses.length + 1});
    c.status(201)
    return c.json(expense);
})
.get("/total-spent", c => {
    // Calculate the total amount from all expenses
    const total = fakeExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    return c.json({ total });
})
.get("/:id{[0-9]+}", c => {  // regex makes sure we get a number as a request
    const id = Number.parseInt(c.req.param('id'))
    const expense = fakeExpenses.find(expense => expense.id === id)
    if (!expense){
        return c.notFound();
    }
    return c.json({expense})
})
.delete("/:id{[0-9]+}", c => {  // regex makes sure we get a number as a request
    const id = Number.parseInt(c.req.param('id'))
    const index = fakeExpenses.findIndex(expense => expense.id === id)
    if (index === -1){
        return c.notFound();
    }
    const deletedExpense = fakeExpenses.splice(index, 1)[0];
    return c.json({expense: deletedExpense});
})



