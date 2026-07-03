import { uuid, pgTable, index, timestamp, text, integer, primaryKey } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gamesTable } from "./games";

// One row per (user, Steam app). gameId is null when the app has no IGDB match yet;
// a re-match pass links rows retroactively as steam_app_map fills in.
export const userSteamGamesTable = pgTable("user_steam_games", {
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  steamAppId: integer("steam_app_id").notNull(),
  gameId: uuid("game_id").references(() => gamesTable.id, { onDelete: "set null" }),
  name: text("name").notNull(),
  playtimeForeverMin: integer("playtime_forever_min").default(0).notNull(),
  playtime2WeeksMin: integer("playtime_2weeks_min").default(0).notNull(),
  lastPlayedAt: timestamp("last_played_at"),
  syncedAt: timestamp("synced_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.steamAppId] }),
  index("user_steam_games_user_idx").on(table.userId),
  index("user_steam_games_game_idx").on(table.gameId),
  index("user_steam_games_playtime_idx").on(table.userId, table.playtimeForeverMin),
]);
