import { Pool } from "pg";
import { env } from "./env";

// Single shared pool. At 100k+ rows (README §2.2, §7) you'll want to be
// deliberate about pool size, batching, and streaming — tune as needed.
export const pool = new Pool({ connectionString: env.databaseUrl });

export async function ping(): Promise<boolean> {
  const { rows } = await pool.query("select 1 as ok");
  return rows[0]?.ok === 1;
}
