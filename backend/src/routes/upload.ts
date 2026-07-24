import { Router } from "express";
import multer from "multer";
import fs from "fs";
import { upload } from "../middlewares/upload";
import { runIngest } from "../services/ingest.service";
import { pool } from "../db";

const router = Router();

// Run multer, translating its errors into clean 4xx responses instead of a
// generic 500 (e.g. file-too-large → 413).
function acceptFile(req: any, res: any, next: any) {
  upload.single("file")(req, res, (err: any) => {
    if (err instanceof multer.MulterError) {
      const msg = err.code === "LIMIT_FILE_SIZE" ? "File too large" : err.message;
      return res.status(413).json({ error: msg });
    }
    if (err) return res.status(400).json({ error: "Upload failed" });
    next();
  });
}

// POST /upload — accept the workbook, persist a job, return 202 immediately,
// and process off the request path so the UI never blocks (README §2.2, §4).
router.post("/", acceptFile, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const filePath = req.file.path;
  const filename = req.file.originalname;

  const { rows } = await pool.query(
    `INSERT INTO ingest_jobs (filename, status)
     VALUES ($1, 'processing') RETURNING id`,
    [filename]
  );
  const jobId = rows[0].id;

  // Hand the client a job id up front; progress is pollable via GET /upload/:id.
  res.status(202).json({ jobId, status: "processing" });

  // Fire-and-forget background processing (streamed + batched).
  (async () => {
    try {
      const summary = await runIngest(filePath, filename, jobId);

      await pool.query(
        `UPDATE ingest_jobs
           SET status = 'completed', finished_at = now(),
               total_rows = $2, processed_rows = $2,
               inserted = $3, merged = $4, failed = $5
         WHERE id = $1`,
        [jobId, summary.read, summary.inserted, summary.merged, summary.failed]
      );
    } catch (err: any) {
      console.error("ingest job failed", err);
      await pool.query(
        `UPDATE ingest_jobs SET status = 'failed', error = $2, finished_at = now() WHERE id = $1`,
        [jobId, err?.message ? String(err.message) : "Ingest failed"]
      );
    } finally {
      fs.promises.unlink(filePath).catch(() => {});
    }
  })();
});

// GET /upload/:id — job status + summary (read / inserted / merged / failed).
router.get("/:id", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT * FROM ingest_jobs WHERE id = $1`,
    [req.params.id]
  );
  if (rows.length === 0) {
    return res.status(404).json({ error: "Job not found" });
  }
  res.json(rows[0]);
});

// GET /upload/:id/failures — the failed rows with their reasons.
router.get("/:id/failures", async (req, res) => {
  const { rows } = await pool.query(
    `SELECT row_number, reason, raw
       FROM ingest_failures
      WHERE job_id = $1
      ORDER BY row_number ASC`,
    [req.params.id]
  );
  res.json(rows);
});

export default router;
