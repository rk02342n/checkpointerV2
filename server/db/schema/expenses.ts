import { numeric, text, pgTable, index, serial, timestamp } from "drizzle-orm/pg-core";
export const expensesTable = pgTable("expenses", {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull(),
  amount: numeric("amount", {precision: 12, scale: 2}).notNull(),
  title: text('title').notNull(),
  createdAt: timestamp('createdAt').defaultNow()
}, (expenses) => [
    index("userId_idx").on(expenses.userId)
  ]
);
