import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

export * from "./schema";

const { Pool } = pg;

// Lazily initialized — only connects when DATABASE_URL is available.
// This allows the server to boot without a DB configured (useful for health
// checks and local development without PostgreSQL).
let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function getConnection() {
  if (!_db) {
    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = new Pool({ connectionString: url });
    _db = drizzle(_pool, { schema });
  }
  return { pool: _pool as pg.Pool, db: _db };
}

export const pool = new Proxy({} as pg.Pool, {
  get(_, prop) {
    return (getConnection().pool as any)[prop as string];
  },
});

export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return (getConnection().db as any)[prop as string];
  },
});
