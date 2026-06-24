// src/lib/supabase/server.ts
//
// Minimal query wrapper so the rest of the app can do `db.query({ text, values })`
// without caring whether the underlying driver is `pg`, `postgres-js`, or the
// Supabase JS client's `.rpc`/raw SQL path. Swap the implementation here only.

import { Pool } from "pg";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // Supabase connection string (pooler, transaction mode)
  ssl: { rejectUnauthorized: false },
});

export const db = {
  async query<T = any>(query: { text: string; values: unknown[] }): Promise<{ rows: T[] }> {
    const result = await pool.query(query.text, query.values);
    return { rows: result.rows };
  },
};
