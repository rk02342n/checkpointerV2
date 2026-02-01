import { uuid, pgTable, index, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gamesTable } from "./games";

export const gameSessionsTable = pgTable("game_sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gameId: uuid("game_id").notNull().references(() => gamesTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"), // null = currently playing
}, (table) => [
  index("game_sessions_user_idx").on(table.userId),
  index("game_sessions_game_idx").on(table.gameId),
  index("game_sessions_active_game_idx").on(table.gameId, table.endedAt),
]);
