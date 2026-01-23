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
  rating: z.string().regex(/^[0-5](\.[0-9])?$/, "Rating must be between 0-5 with optional decimal").optional(),
  reviewText: z.string().max(5000, "Review text must be less than 5000 characters").optional()
});

export const createReviewSchema = reviewsInsertSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type CreateReview = z.infer<typeof createReviewSchema>;

export const reviewsSelectSchema = createSelectSchema(reviewsTable);

// Export individual field validators for forms
export const reviewFieldValidators = {
  rating: z.string().regex(/^[0-5](\.[0-9])?$/, "Rating must be between 0-5 with optional decimal").optional(),
  reviewText: z.string().max(5000, "Review text must be less than 5000 characters").optional()
};
