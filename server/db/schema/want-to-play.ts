import { uuid, pgTable, pgEnum, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gamesTable } from "./games";

// "steam" = explicitly imported from the user's Steam wishlist
export const wantToPlaySourceEnum = pgEnum("want_to_play_source", ["manual", "steam"]);

export const wantToPlayTable = pgTable("want_to_play", {
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  source: wantToPlaySourceEnum("source").default("manual").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.gameId] }),
  index("want_to_play_user_idx").on(table.userId),
  index("want_to_play_game_idx").on(table.gameId)
]);
