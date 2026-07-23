import { Router } from "express";
import multer from "multer";
import { pool } from "../db";
import { processFile } from "../ingestion/processFile";

const router = Router();

const upload = multer({ storage: multer.memoryStorage() });

router.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "no file uploaded (field name must be 'file')" });
  }

  try {
    const { rows } = await pool.query(
      `insert into ingest_jobs (filename, status)
       values ($1, 'pending')
       returning id`,
      [req.file.originalname]
    );

    const jobId = rows[0].id;
    processFile(jobId, req.file.buffer, req.file.originalname).catch((err) => {
      console.error(`[ingest] unhandled error for job ${jobId}`, err);
    });

    res.status(202).json({
      jobId,
      status: "pending",
      message: "upload received, processing started"
    });
  } catch (err) {
    console.error("[ingest/upload] failed to create job", err);
    res.status(500).json({ error: "failed to start ingestion job" });
  }
});

router.get("/status/:jobId", async (req, res) => {
  const jobId = parseInt(req.params.jobId, 10);
  if (isNaN(jobId)) {
    return res.status(400).json({ error: "invalid jobId" });
  }

  const { rows } = await pool.query(`select * from ingest_jobs where id = $1`, [jobId]);
  if (rows.length === 0) {
    return res.status(404).json({ error: "job not found" });
  }

  res.json(rows[0]);
});

router.get("/failures/:jobId", async (req, res) => {
  const jobId = parseInt(req.params.jobId, 10);
  if (isNaN(jobId)) {
    return res.status(400).json({ error: "invalid jobId" });
  }

  const { rows } = await pool.query(
    `select * from ingest_failures where job_id = $1 order by row_number asc`,
    [jobId]
  );
  res.json(rows);
});

export default router;