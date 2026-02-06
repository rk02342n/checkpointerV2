import { uuid, pgTable, index, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const platformsTable = pgTable("platforms", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").unique(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
  abbreviation: text("abbreviation"),
}, (table) => [
  index("platforms_name_idx").on(table.name),
  index("platforms_igdb_idx").on(table.igdbId),
]);

export const platformsInsertSchema = createInsertSchema(platformsTable, {
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const platformsSelectSchema = createSelectSchema(platformsTable);
