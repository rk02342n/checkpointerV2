import { pgTable, text, json, timestamp, uuid } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

export const appSettingsTable = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: json("value").notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  updatedBy: uuid("updated_by").references(() => usersTable.id),
});
