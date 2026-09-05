import "dotenv/config";
import { defineConfig } from "drizzle-kit";
export default defineConfig({ schema: "./db/schema.ts", out: "./db/migrations/generated", dialect: "postgresql", dbCredentials: { url: process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5432/caselawindia" }, strict: true, verbose: true });
