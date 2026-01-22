import { uuid, pgTable, index, timestamp, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod'
import { usersTable } from "./users";
import { gamesTable } from "./games";

export const reviewsTable = pgTable("reviews", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id),
  gameId: uuid("game_id")
    .notNull()
    .references(() => gamesTable.id),
  rating: numeric("rating", { precision: 2, scale: 1 }),
  reviewText: text("review_text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
}, (reviews) => [
  index("reviews_user_idx").on(reviews.userId),
  index("reviews_game_idx").on(reviews.gameId)
]);

export const reviewsInsertSchema = createInsertSchema(reviewsTable, {
  rating: z.number().min(0).max(5),
  reviewText: z.string().max(5000).optional()
});

export const reviewsSelectSchema = createSelectSchema(reviewsTable);
