import { uuid, pgTable, primaryKey, index } from "drizzle-orm/pg-core";
import { gamesTable } from "./games";
import { platformsTable } from "./platforms";

export const gamePlatformsTable = pgTable("game_platforms", {
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  platformId: uuid("platform_id")
    .notNull()
    .references(() => platformsTable.id, { onDelete: "cascade" }),
}, (table) => [
  primaryKey({ columns: [table.gameId, table.platformId] }),
  index("game_platforms_game_idx").on(table.gameId),
  index("game_platforms_platform_idx").on(table.platformId),
]);
