import pg from "pg";
import { config } from "./config.js";

let pool: pg.Pool | undefined;

export function database() {
  if (!config.DATABASE_URL) return undefined;
  pool ??= new pg.Pool({ connectionString: config.DATABASE_URL, max: 10, idleTimeoutMillis: 30_000, connectionTimeoutMillis: 5_000, statement_timeout: 10_000, query_timeout: 12_000 });
  return pool;
}
