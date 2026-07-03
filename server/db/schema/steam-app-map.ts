import { pgTable, index, integer, timestamp } from "drizzle-orm/pg-core";

// Steam appid -> IGDB id mapping, seeded from IGDB's external_games endpoint
// (external game source 1 = Steam) during the weekly IGDB sync.
export const steamAppMapTable = pgTable("steam_app_map", {
  steamAppId: integer("steam_app_id").primaryKey(),
  igdbId: integer("igdb_id").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => [
  index("steam_app_map_igdb_idx").on(table.igdbId),
]);
