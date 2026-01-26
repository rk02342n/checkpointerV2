import { uuid, pgTable, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { reviewsTable } from "./reviews";

export const reviewLikesTable = pgTable("review_likes", {
  userId: uuid("user_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  reviewId: uuid("review_id")
    .notNull()
    .references(() => reviewsTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.userId, table.reviewId] }),
  index("review_likes_review_idx").on(table.reviewId),
  index("review_likes_user_idx").on(table.userId)
]);
