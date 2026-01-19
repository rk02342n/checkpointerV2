import { numeric, text, pgTable, index, serial, timestamp, date } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod'

export const expensesTable = pgTable("expenses", {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  amount: numeric('amount', {precision: 12, scale: 2}).notNull(),
  title: text('title').notNull(),
  date: date('date').notNull(),
  createdAt: timestamp('createdAt').defaultNow()
}, (expenses) => [
    index("userId_idx").on(expenses.userId)
  ]
);

export const expensesInsertSchema = createInsertSchema(expensesTable, 
  {
    title: z
      .string()
      .min(3, { message: "Title needs to be more than 3 chars" }),
    amount: z
      .string()
      .regex(/^\d+(\.\d{1,2})?$/, { message: "Amount should be a positive number" })
  });

export const expensesSelectSchema = createSelectSchema(expensesTable);
