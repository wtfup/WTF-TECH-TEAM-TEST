/**
 * Seed the open positions from /sample-data/positions.json (README §2.4).
 *
 * This is a STUB: it loads and prints the positions, but the INSERT is left to
 * you because you own the `positions` table shape (README §5). Wire it up once
 * your migration creates the table.
 *
 *   npm run seed
 */
import fs from "fs";
import path from "path";
import { pool } from "./db";

type Position = {
  id: string;
  title: string;
  required_skills: string[];
  min_experience: number;
  location: string;
  remote: boolean;
};

async function run() {
  const file = path.resolve(__dirname, "../../sample-data/positions.json");
  const positions: Position[] = JSON.parse(fs.readFileSync(file, "utf8"));
  console.log(`Loaded ${positions.length} positions from sample-data/positions.json`);

  // TODO (candidate): upsert these into your positions table, e.g.
  //
  // for (const p of positions) {
  //   await pool.query(
  //     `insert into positions (id, title, required_skills, min_experience, location, remote)
  //      values ($1,$2,$3,$4,$5,$6)
  //      on conflict (id) do update set
  //        title = excluded.title,
  //        required_skills = excluded.required_skills,
  //        min_experience = excluded.min_experience,
  //        location = excluded.location,
  //        remote = excluded.remote`,
  //     [p.id, p.title, p.required_skills, p.min_experience, p.location, p.remote]
  //   );
  // }

  console.log("TODO (candidate): create the positions table and insert these (README §2.4/§5)");
  await pool.end();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
