/**
 * Minimal forward-only migration runner. Applies every .sql file in
 * ./migrations (sorted by filename) exactly once, tracked in schema_migrations.
 *
 * We give you the RUNNER and one starter migration (users). Designing the rest
 * of the schema — candidates, positions, ingest_jobs, ingest_failures,
 * email_sends, indexes — is part of the test (README §5, graded).
 *
 *   npm run migrate
 */
import fs from "fs";
import path from "path";
import { pool } from "./db";

async function run() {
  await pool.query(`
    create table if not exists schema_migrations (
      filename text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const dir = path.resolve(__dirname, "../migrations");
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  const { rows } = await pool.query("select filename from schema_migrations");
  const applied = new Set(rows.map((r) => r.filename));

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= skip ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(dir, file), "utf8");
    const client = await pool.connect();
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into schema_migrations(filename) values ($1)", [file]);
      await client.query("commit");
      console.log(`+ applied ${file}`);
    } catch (err) {
      await client.query("rollback");
      console.error(`x failed ${file}:`, err);
      process.exit(1);
    } finally {
      client.release();
    }
  }

  console.log("migrations up to date");
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
