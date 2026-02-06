import { uuid, pgTable, index, text, integer } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

export const keywordsTable = pgTable("keywords", {
  id: uuid("id").defaultRandom().primaryKey(),
  igdbId: integer("igdb_id").unique(),
  name: text("name").notNull().unique(),
  slug: text("slug").notNull().unique(),
}, (table) => [
  index("keywords_name_idx").on(table.name),
  index("keywords_igdb_idx").on(table.igdbId),
]);

export const keywordsInsertSchema = createInsertSchema(keywordsTable, {
  name: z.string().min(1),
  slug: z.string().min(1),
});

export const keywordsSelectSchema = createSelectSchema(keywordsTable);
