import { uuid, pgTable, index, timestamp, text } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod'

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  kindeId: text("kinde_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (users) => [
  index("users_auth_idx").on(users.kindeId),
  index("users_username_idx").on(users.username)
]);

export const usersInsertSchema = createInsertSchema(usersTable, {
  username: z.string().min(3).max(32),
  kindeId: z.string().min(5)
});

export const usersSelectSchema = createSelectSchema(usersTable);
