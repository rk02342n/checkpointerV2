import { Hono } from "hono";
import { db } from "../db";
import { appSettingsTable } from "../db/schema/app-settings";

// Default settings values
const defaultSettings: Record<string, unknown> = {
  darkModeEnabled: true,
};

export const settingsRoute = new Hono()
  // GET /settings - Public endpoint for fetching app settings
  .get("/", async (c) => {
    const settings = await db
      .select({
        key: appSettingsTable.key,
        value: appSettingsTable.value,
      })
      .from(appSettingsTable);

    // Convert array to object with defaults
    const settingsMap: Record<string, unknown> = { ...defaultSettings };
    for (const setting of settings) {
      settingsMap[setting.key] = setting.value;
    }

    return c.json(settingsMap);
  });
