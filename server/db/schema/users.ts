import { uuid, pgTable, pgEnum, index, timestamp, text, boolean, jsonb } from "drizzle-orm/pg-core";
import type { ProfileTheme } from "../../lib/profileThemeConstants";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod'

export const userRoleEnum = pgEnum("user_role", ["free", "pro", "admin"]);

export const usersTable = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  kindeId: text("kinde_id").notNull().unique(),
  username: text("username").notNull().unique(),
  displayName: text("display_name"),
  bio: text("bio"),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").default("free").notNull(),
  isPublic: boolean("is_public").default(true).notNull(),
  suspendedAt: timestamp("suspended_at"),
  profileTheme: jsonb("profile_theme").$type<ProfileTheme>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (users) => [
  index("users_auth_idx").on(users.kindeId),
  index("users_username_idx").on(users.username)
]);

export const userRoles = ["free", "pro", "admin"] as const;
export type UserRole = (typeof userRoles)[number];

export const usersInsertSchema = createInsertSchema(usersTable, {
  username: z.string().min(3).max(32),
  kindeId: z.string().min(5),
  role: z.enum(userRoles).optional()
});

export const usersSelectSchema = createSelectSchema(usersTable);
