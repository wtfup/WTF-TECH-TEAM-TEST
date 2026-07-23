import * as XLSX from "xlsx";
import { pool } from "../db";
import { mapRow, MappedCandidate } from "./mapRow";

const BATCH_SIZE = 500;

export async function processFile(jobId: number, buffer: Buffer, filename: string) {
  try {
    await pool.query(`update ingest_jobs set status = 'processing' where id = $1`, [jobId]);

    const workbook = XLSX.read(buffer, { type: "buffer" });

    let totalRows = 0;
    let processed = 0;
    let inserted = 0;
    let merged = 0;
    let failed = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      totalRows += json.length;
    }
    await pool.query(`update ingest_jobs set total_rows = $1 where id = $2`, [totalRows, jobId]);

    let rowNumber = 0;

    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      const json: Record<string, any>[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      let batch: { mapped: MappedCandidate; raw: Record<string, any>; rowNumber: number }[] = [];

      for (const raw of json) {
        rowNumber++;

        const isBlank = Object.values(raw).every((v) => String(v).trim() === "");
        if (isBlank) {
          processed++;
          continue;
        }

        const mapped = mapRow(raw);
        if (!mapped || !mapped.name) {
          failed++;
          await pool.query(
            `insert into ingest_failures (job_id, row_number, raw, reason)
             values ($1, $2, $3, $4)`,
            [jobId, rowNumber, JSON.stringify(raw), "unrecognized row shape or missing name"]
          );
          processed++;
          continue;
        }

        batch.push({ mapped, raw, rowNumber });

        if (batch.length >= BATCH_SIZE) {
          const result = await flushBatch(jobId, batch, filename);
          inserted += result.inserted;
          merged += result.merged;
          failed += result.failed;
          processed += batch.length;
          batch = [];

          await pool.query(
            `update ingest_jobs
             set processed_rows = $1, inserted = $2, merged = $3, failed = $4
             where id = $5`,
            [processed, inserted, merged, failed, jobId]
          );
        }
      }

      if (batch.length > 0) {
        const result = await flushBatch(jobId, batch, filename);
        inserted += result.inserted;
        merged += result.merged;
        failed += result.failed;
        processed += batch.length;

        await pool.query(
          `update ingest_jobs
           set processed_rows = $1, inserted = $2, merged = $3, failed = $4
           where id = $5`,
          [processed, inserted, merged, failed, jobId]
        );
      }
    }

    await pool.query(
      `update ingest_jobs set status = 'completed', finished_at = now() where id = $1`,
      [jobId]
    );
  } catch (err) {
    console.error(`[ingest] job ${jobId} crashed`, err);
    await pool.query(
      `update ingest_jobs set status = 'failed', error = $1, finished_at = now() where id = $2`,
      [String(err), jobId]
    );
  }
}

async function flushBatch(
  jobId: number,
  batch: { mapped: MappedCandidate; raw: Record<string, any>; rowNumber: number }[],
  filename: string
): Promise<{ inserted: number; merged: number; failed: number }> {
  let inserted = 0;
  let merged = 0;
  let failed = 0;

  const client = await pool.connect();
  try {
    await client.query("begin");

    for (const { mapped, raw, rowNumber } of batch) {
      try {
        if (mapped.email) {
          const result = await client.query(
            `insert into candidates
               (email, name, phone, skills, years_of_experience, seniority, location, raw, source_file)
             values ($1,$2,$3,$4,$5,$6,$7,$8,$9)
             on conflict (email) do update set
               phone = coalesce(candidates.phone, excluded.phone),
               skills = (
                 select array(select distinct unnest(candidates.skills || excluded.skills))
               ),
               years_of_experience = coalesce(candidates.years_of_experience, excluded.years_of_experience),
               seniority = coalesce(candidates.seniority, excluded.seniority),
               location = coalesce(candidates.location, excluded.location),
               updated_at = now()
             returning (xmax = 0) as was_insert`,
            [
              mapped.email,
              mapped.name,
              mapped.phone,
              mapped.skills,
              mapped.years_of_experience,
              mapped.seniority,
              mapped.location,
              JSON.stringify(raw),
              filename,
            ]
          );
          if (result.rows[0].was_insert) inserted++;
          else merged++;
        } else {
          await client.query(
            `insert into candidates
               (email, name, phone, skills, years_of_experience, seniority, location, raw, source_file)
             values (null,$1,$2,$3,$4,$5,$6,$7,$8)`,
            [
              mapped.name,
              mapped.phone,
              mapped.skills,
              mapped.years_of_experience,
              mapped.seniority,
              mapped.location,
              JSON.stringify(raw),
              filename,
            ]
          );
          inserted++;
        }
      } catch (rowErr) {
        failed++;
        await client.query(
          `insert into ingest_failures (job_id, row_number, raw, reason) values ($1,$2,$3,$4)`,
          [jobId, rowNumber, JSON.stringify(raw), String(rowErr)]
        );
      }
    }

    await client.query("commit");
  } catch (batchErr) {
    await client.query("rollback");
    console.error("[ingest] batch failed, rolling back", batchErr);
    failed += batch.length;
    inserted = 0;
    merged = 0;
  } finally {
    client.release();
  }

  return { inserted, merged, failed };
}