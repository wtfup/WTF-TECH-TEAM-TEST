import ExcelJS from "exceljs";
import { pool } from "../db";
import { normalizeHeader } from "../utils/headerMap";
import { enrichCandidate, EnrichedCandidate } from "./enrichment.service";
import { dedupeByEmail } from "./merge";

export type IngestSummary = { read: number; inserted: number; merged: number; failed: number };

// Rows per batched upsert. 1000 rows × 8 params = 8000, well under Postgres' 65535
// bind-parameter ceiling, and enough to amortise round-trips at 100k+ scale.
const BATCH_SIZE = 1000;

type Item = { enriched: EnrichedCandidate; raw: Record<string, any>; rowNumber: number };

function cellValue(v: any): any {
  if (v == null || typeof v !== "object") return v;
  if (v instanceof Date) return v.toISOString();
  if ("text" in v) return v.text;
  if ("result" in v) return v.result;
  if ("richText" in v) return v.richText.map((r: any) => r.text).join("");
  return v;
}

async function recordFailure(jobId: number, rowNumber: number, raw: any, reason: string) {
  try {
    await pool.query(
      `INSERT INTO ingest_failures (job_id, row_number, raw, reason) VALUES ($1,$2,$3,$4)`,
      [jobId, rowNumber, raw, reason]
    );
  } catch (err) {
    console.error("failed to record ingest failure", err);
  }
}

// Batched upsert. Returns one boolean per landed row: true = inserted, false = merged.
async function batchUpsert(items: Item[], sourceFile: string): Promise<boolean[]> {
  if (!items.length) return [];

  const cols = 9;
  const params: any[] = [];
  const tuples = items
    .map((it, i) => {
      const b = i * cols;
      params.push(
        it.enriched.email,
        it.enriched.full_name,
        it.enriched.phone,
        it.enriched.skills,
        it.enriched.experience_years,
        it.enriched.seniority,
        it.enriched.location,
        it.raw,
        sourceFile
      );
      return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`;
    })
    .join(",");

  const { rows } = await pool.query(
    `
    INSERT INTO candidates
      (email, name, phone, skills, years_of_experience, seniority, location, raw, source_file)
    VALUES ${tuples}
    ON CONFLICT (email) DO UPDATE SET
      name                = COALESCE(NULLIF(EXCLUDED.name, ''), candidates.name),
      phone               = COALESCE(NULLIF(EXCLUDED.phone, ''), candidates.phone),
      skills              = CASE WHEN cardinality(EXCLUDED.skills) > 0
                                 THEN EXCLUDED.skills ELSE candidates.skills END,
      years_of_experience = COALESCE(EXCLUDED.years_of_experience, candidates.years_of_experience),
      seniority           = COALESCE(NULLIF(EXCLUDED.seniority, ''), candidates.seniority),
      location            = COALESCE(NULLIF(EXCLUDED.location, ''), candidates.location),
      raw                 = EXCLUDED.raw,
      source_file         = EXCLUDED.source_file,
      updated_at          = now()
    RETURNING (xmax = 0) AS inserted
    `,
    params
  );

  return rows.map((r) => r.inserted === true);
}

// Stream the workbook row-by-row (never the whole sheet in memory), enrich, and
// land candidates in batches. Failures are persisted with reasons; progress is
// written to ingest_jobs as it goes (README §2.2, §4).
export async function runIngest(
  filePath: string,
  sourceFile: string,
  jobId: number
): Promise<IngestSummary> {
  const summary: IngestSummary = { read: 0, inserted: 0, merged: 0, failed: 0 };
  let headers: string[] = [];
  let buffer: Item[] = [];

  const flush = async () => {
    if (!buffer.length) return;
    const current = buffer;
    buffer = [];

    // Collapse in-file duplicate emails before the upsert (a single statement
    // cannot touch the same conflict target twice).
    const deduped = dedupeByEmail(current.map((c) => c.enriched));
    summary.merged += current.length - deduped.length;
    const items: Item[] = deduped.map((enriched) => {
      const src = current.find((c) => c.enriched.email === enriched.email)!;
      return { enriched, raw: src.raw, rowNumber: src.rowNumber };
    });

    try {
      const flags = await batchUpsert(items, sourceFile);
      const insertedCount = flags.filter(Boolean).length;
      summary.inserted += insertedCount;
      summary.merged += flags.length - insertedCount;
    } catch {
      // Isolate the bad row so the rest of the batch still lands.
      for (const item of items) {
        try {
          const flags = await batchUpsert([item], sourceFile);
          flags[0] ? summary.inserted++ : summary.merged++;
        } catch (e: any) {
          summary.failed++;
          await recordFailure(jobId, item.rowNumber, item.raw, e?.message ?? "Insert failed");
        }
      }
    }

    await pool.query(
      `UPDATE ingest_jobs SET processed_rows = $2, inserted = $3, merged = $4, failed = $5 WHERE id = $1`,
      [jobId, summary.inserted + summary.merged + summary.failed, summary.inserted, summary.merged, summary.failed]
    );
  };

  const reader = new ExcelJS.stream.xlsx.WorkbookReader(filePath, {
    sharedStrings: "cache",
    worksheets: "emit",
    entries: "emit",
  });

  for await (const worksheet of reader as any) {
    for await (const row of worksheet) {
      const values = row.values as any[]; // sparse; index 1 == column A
      if (row.number === 1) {
        headers = [];
        for (let c = 1; c < values.length; c++) {
          headers[c - 1] = normalizeHeader(String(values[c] ?? ""));
        }
        continue;
      }

      const obj: Record<string, any> = {};
      for (let c = 1; c < values.length; c++) {
        const key = headers[c - 1];
        if (key) obj[key] = cellValue(values[c]);
      }

      summary.read++;
      const enriched = enrichCandidate(obj);

      if (!enriched.email) {
        summary.failed++;
        await recordFailure(jobId, row.number, obj, "Missing email");
        continue;
      }
      if (!enriched.full_name) {
        summary.failed++;
        await recordFailure(jobId, row.number, obj, "Missing name");
        continue;
      }

      buffer.push({ enriched, raw: obj, rowNumber: row.number });
      if (buffer.length >= BATCH_SIZE) await flush();
    }
    // Continue to the next worksheet — the sample spreads rows across three
    // sheets with different headers (README §2.2).
  }

  await flush();
  return summary;
}
