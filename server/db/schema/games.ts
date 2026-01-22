import { uuid, pgTable, index, timestamp, serial, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod'

export const gamesTable = pgTable("games", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: serial("igdb_id").notNull().unique(),
  name: text("name").notNull(),
  slug: text("slug").unique(),
  summary: text("summary"),
  releaseDate: timestamp("release_date"),
  coverUrl: text("cover_url"),
  rating: numeric("rating", { precision: 3, scale: 2 }).default("0"),
  ratingCount: serial("rating_count"),
  igdbRating: numeric("igdb_rating", { precision: 3, scale: 2 }).default("0"),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (games) => [
  index("games_name_idx").on(games.name),
  index("games_igdb_idx").on(games.igdbId),
]);

export const gamesInsertSchema = createInsertSchema(gamesTable, {
  name: z.string().min(1),
  igdbId: z.number().int().positive()
});

export const gamesSelectSchema = createSelectSchema(gamesTable);
