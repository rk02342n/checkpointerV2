import { uuid, pgTable, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gameListsTable } from "./game-lists";

export const savedGameListsTable = pgTable("saved_game_lists", {
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  listId: uuid("list_id")
    .notNull()
    .references(() => gameListsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.listId] }),
  index("saved_game_lists_user_idx").on(table.userId),
  index("saved_game_lists_list_idx").on(table.listId),
]);
