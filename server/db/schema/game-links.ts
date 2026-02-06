import { uuid, pgTable, index, text, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { gamesTable } from "./games";

export const linkCategoryEnum = pgEnum("link_category", [
  "official", "steam", "gog", "epic", "itch",
  "wikipedia", "twitter", "reddit", "youtube", "twitch", "discord", "other",
]);

export const gameLinksTable = pgTable("game_links", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  category: linkCategoryEnum("category").notNull(),
  url: text("url").notNull(),
  label: text("label"),
}, (table) => [
  index("game_links_game_idx").on(table.gameId),
]);

export const gameLinksInsertSchema = createInsertSchema(gameLinksTable);
export const gameLinksSelectSchema = createSelectSchema(gameLinksTable);
