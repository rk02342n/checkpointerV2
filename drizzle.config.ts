// drizzle.config.ts
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema/*",
  dbCredentials: {
    url: process.env.DATABASE_URL!
  },
  out: "./drizzle"
});
