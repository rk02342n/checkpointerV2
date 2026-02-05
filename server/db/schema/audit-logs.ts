import { uuid, pgTable, pgEnum, timestamp, text, json } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const auditActionEnum = pgEnum("audit_action", [
  "UPDATE_USER_ROLE",
  "SUSPEND_USER",
  "UNSUSPEND_USER",
  "DELETE_REVIEW",
  "DELETE_USER",
  "UPDATE_SETTING",
]);

export const auditLogsTable = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  adminId: uuid("admin_id").references(() => usersTable.id).notNull(),
  action: auditActionEnum("action").notNull(),
  resourceType: text("resource_type").notNull(), // 'user', 'review', 'game'
  resourceId: uuid("resource_id").notNull(),
  details: json("details").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
