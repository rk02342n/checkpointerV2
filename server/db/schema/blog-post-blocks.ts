import { uuid, pgTable, pgEnum, index, timestamp, text, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { blogPostsTable } from "./blog-posts";
import { gamesTable } from "./games";
import { gameListsTable } from "./game-lists";

export type BlockData = {
  alignment?: "left" | "center" | "right";
  width?: "narrow" | "normal" | "wide" | "full";
  [key: string]: unknown;
};

export const blockTypeEnum = pgEnum("block_type", ["text", "image", "game_embed", "list_embed"]);

export const blogPostBlocksTable = pgTable("blog_post_blocks", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id")
    .notNull()
    .references(() => blogPostsTable.id, { onDelete: "cascade" }),
  blockType: blockTypeEnum("block_type").notNull(),
  position: integer("position").notNull().default(0),
  content: text("content"),
  imageUrl: text("image_url"),
  imageCaption: text("image_caption"),
  gameId: uuid("game_id")
    .references(() => gamesTable.id, { onDelete: "set null" }),
  listId: uuid("list_id")
    .references(() => gameListsTable.id, { onDelete: "set null" }),
  data: jsonb("data").$type<BlockData>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("blog_post_blocks_post_idx").on(table.postId),
  index("blog_post_blocks_post_position_idx").on(table.postId, table.position),
  index("blog_post_blocks_game_idx").on(table.gameId),
  index("blog_post_blocks_list_idx").on(table.listId),
]);

export const blockTypes = ["text", "image", "game_embed", "list_embed"] as const;
export type BlockType = (typeof blockTypes)[number];

export const blogPostBlocksInsertSchema = createInsertSchema(blogPostBlocksTable, {
  blockType: z.enum(blockTypes),
  position: z.number().int().min(0),
  content: z.string().max(50000).optional(),
  imageCaption: z.string().max(500).optional(),
});

export const blogPostBlocksSelectSchema = createSelectSchema(blogPostBlocksTable);

export const createBlockSchema = blogPostBlocksInsertSchema.omit({
  id: true,
  postId: true,
  createdAt: true,
}).extend({
  position: z.number().int().min(0).optional(),
});

export type CreateBlock = z.infer<typeof createBlockSchema>;
