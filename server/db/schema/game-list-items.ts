import { uuid, pgTable, timestamp, integer, primaryKey, index } from "drizzle-orm/pg-core";
import { gameListsTable } from "./game-lists";
import { gamesTable } from "./games";

export const gameListItemsTable = pgTable("game_list_items", {
  listId: uuid("list_id")
    .notNull()
    .references(() => gameListsTable.id, { onDelete: "cascade" }),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.listId, table.gameId] }),
  index("game_list_items_list_idx").on(table.listId),
  index("game_list_items_game_idx").on(table.gameId),
  index("game_list_items_position_idx").on(table.listId, table.position)
]);
