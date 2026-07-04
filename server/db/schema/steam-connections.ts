import { uuid, pgTable, pgEnum, index, timestamp, text } from "drizzle-orm/pg-core";
import { createSelectSchema } from "drizzle-zod";
import { usersTable } from "./users";

// "pending" = a sync job is queued or running (set on connect and on manual
// sync); "private_profile" = Steam game details are private
export const steamSyncStatusEnum = pgEnum("steam_sync_status", [
  "pending", "ok", "private_profile", "error",
]);

export const steamConnectionsTable = pgTable("steam_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => usersTable.id, { onDelete: "cascade" }),
  steamId64: text("steam_id64").notNull().unique(),
  personaName: text("persona_name"),
  avatarUrl: text("avatar_url"),
  profileUrl: text("profile_url"),
  syncStatus: steamSyncStatusEnum("sync_status").default("pending").notNull(),
  lastSyncedAt: timestamp("last_synced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => [
  index("steam_connections_user_idx").on(table.userId),
]);

export const steamConnectionsSelectSchema = createSelectSchema(steamConnectionsTable);

export type SteamSyncStatus = (typeof steamSyncStatusEnum.enumValues)[number];
