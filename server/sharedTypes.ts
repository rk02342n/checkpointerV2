import { expensesInsertSchema } from './db/schema/expenses';
import { z } from 'zod'

export const createExpenseSchema = expensesInsertSchema.omit({
    userId: true,
    createdAt: true,
    id: true
});

export type CreateExpense = z.infer<typeof createExpenseSchema>;
