import { uuid, pgTable, index, text, integer, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { gamesTable } from "./games";

export const imageTypeEnum = pgEnum("image_type", ["screenshot", "artwork", "cover"]);

export const gameImagesTable = pgTable("game_images", {
  id: uuid("id").defaultRandom().primaryKey(),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id, { onDelete: "cascade" }),
  igdbImageId: text("igdb_image_id"),
  imageType: imageTypeEnum("image_type").notNull(),
  url: text("url").notNull(),
  width: integer("width"),
  height: integer("height"),
  position: integer("position").notNull().default(0),
}, (table) => [
  index("game_images_game_idx").on(table.gameId),
  index("game_images_type_idx").on(table.gameId, table.imageType),
]);

export const gameImagesInsertSchema = createInsertSchema(gameImagesTable);
export const gameImagesSelectSchema = createSelectSchema(gameImagesTable);
