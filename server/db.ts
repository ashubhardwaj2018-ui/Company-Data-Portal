import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// EXTERNAL_DATABASE_URL (e.g. a self-hosted Postgres) takes priority over
// the Replit-managed DATABASE_URL when set.
const connectionString = process.env.EXTERNAL_DATABASE_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

if (process.env.EXTERNAL_DATABASE_URL) {
  console.log("[db] Using EXTERNAL_DATABASE_URL (external Postgres server)");
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });
