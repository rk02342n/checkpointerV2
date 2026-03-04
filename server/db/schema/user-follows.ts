import { uuid, pgTable, timestamp, primaryKey, index } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const userFollowsTable = pgTable("user_follows", {
  followerId: uuid("follower_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  followingId: uuid("following_id")
    .notNull()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.followerId, table.followingId] }),
  index("user_follows_follower_idx").on(table.followerId),
  index("user_follows_following_idx").on(table.followingId)
]);
