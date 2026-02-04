import { uuid, pgTable, index, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { usersTable } from "./users";
import { gamesTable } from "./games";

// Session status enum - only applies when session has ended
export const sessionStatusEnum = pgEnum("session_status", ["finished", "stashed"]);

export const gameSessionsTable = pgTable("game_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  gameId: uuid("game_id").notNull().references(() => gamesTable.id, { onDelete: "cascade" }),
  startedAt: timestamp("started_at").defaultNow().notNull(),
  endedAt: timestamp("ended_at"), // null = currently playing
  status: sessionStatusEnum("status"), // null while playing, set when session ends
}, (table) => [
  index("game_logs_user_idx").on(table.userId),
  index("game_logs_game_idx").on(table.gameId),
  index("game_logs_active_game_idx").on(table.gameId, table.endedAt),
]);

// Export types
export type SessionStatus = "finished" | "stashed";
