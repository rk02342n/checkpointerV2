import { uuid, pgTable, index, timestamp, text, integer, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gamesTable } from "./games";

// Steam wishlist staging layer. Rows are never auto-promoted into want_to_play;
// importedAt is set when the user explicitly confirms the import.
// name is nullable — Steam's wishlist API returns only appids, so the name
// comes from the IGDB match (or stays null for unmatched entries).
export const userSteamWishlistTable = pgTable("user_steam_wishlist", {
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  steamAppId: integer("steam_app_id").notNull(),
  gameId: uuid("game_id").references(() => gamesTable.id, { onDelete: "set null" }),
  name: text("name"),
  addedAt: timestamp("added_at"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
  importedAt: timestamp("imported_at"),
}, (table) => [
  primaryKey({ columns: [table.userId, table.steamAppId] }),
  index("user_steam_wishlist_user_idx").on(table.userId),
  index("user_steam_wishlist_game_idx").on(table.gameId),
]);
