import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  // ✅ FIXED: allow all schema files instead of only index.ts
  schema: "./src/schema/*.ts",

  dialect: "postgresql",

  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});