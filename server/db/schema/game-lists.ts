import { uuid, pgTable, pgEnum, timestamp, text, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const listVisibilityEnum = pgEnum("list_visibility", ["public", "private"]);

export const gameListsTable = pgTable("game_lists", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  visibility: listVisibilityEnum("visibility").default("public").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("game_lists_user_idx").on(table.userId),
  index("game_lists_visibility_idx").on(table.visibility)
]);
