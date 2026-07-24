import { Router } from "express";
import { findMatches } from "../services/match.service";
import { pool } from "../db";

const router = Router();

// Whitelist of sortable columns — never interpolate a raw client value into SQL.
const SORT_COLUMNS: Record<string, string> = {
  name: "name",
  experience: "years_of_experience",
  created: "created_at",
};

// GET /candidates?q=&skill=&sort=&dir=&page=&pageSize= — server-paginated list.
//   q      free-text search over name/email (case-insensitive)
//   skill  array-containment filter, backed by the GIN index on candidates.skills
//   sort   one of name|experience|created (default created); dir asc|desc
router.get("/", async (req, res) => {
  try {
    const q = req.query.q ? String(req.query.q).trim() : null;
    const skill = req.query.skill
      ? String(req.query.skill).toLowerCase().trim()
      : null;

    const sortCol = SORT_COLUMNS[String(req.query.sort ?? "")] ?? "created_at";
    const sortDir =
      String(req.query.dir ?? "").toLowerCase() === "asc" ? "ASC" : "DESC";

    const page = Math.max(1, parseInt(String(req.query.page ?? "1"), 10) || 1);
    const pageSize = Math.min(
      100,
      Math.max(1, parseInt(String(req.query.pageSize ?? "25"), 10) || 25)
    );
    const offset = (page - 1) * pageSize;

    const filters: string[] = [];
    const params: any[] = [];
    if (q) {
      params.push(`%${q}%`);
      filters.push(`(name ILIKE $${params.length} OR email ILIKE $${params.length})`);
    }
    if (skill) {
      params.push([skill]);
      filters.push(`skills @> $${params.length}::text[]`);
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    const totalResult = await pool.query(
      `SELECT count(*)::int AS total FROM candidates ${where}`,
      params
    );
    const total = totalResult.rows[0].total;

    params.push(pageSize, offset);
    const { rows } = await pool.query(
      `
      SELECT id, name, email, skills, years_of_experience, seniority, location, created_at
      FROM candidates
      ${where}
      ORDER BY ${sortCol} ${sortDir}, id DESC
      LIMIT $${params.length - 1} OFFSET $${params.length}
    `,
      params
    );

    res.json({ items: rows, total, page, pageSize });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch candidates" });
  }
});

// GET /candidates/:id — single candidate.
router.get("/:id", async (req, res) => {
  try {
    const candidateId = Number(req.params.id);
    if (Number.isNaN(candidateId)) {
      return res.status(400).json({ error: "Invalid candidate id" });
    }

    const { rows } = await pool.query(
      `SELECT id, name, email, skills, years_of_experience, seniority, location,
              source_file, created_at
       FROM candidates WHERE id = $1`,
      [candidateId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Candidate not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch candidate" });
  }
});

// GET /candidates/:id/matches — rank positions for this candidate.
router.get("/:id/matches", async (req, res) => {
  try {
    const candidateId = Number(req.params.id);
    if (Number.isNaN(candidateId)) {
      return res.status(400).json({ error: "Invalid candidate id" });
    }

    const matches = await findMatches(candidateId);
    res.json(matches);
  } catch (err: any) {
    console.error(err);
    if (err?.message === "Candidate not found") {
      return res.status(404).json({ error: err.message });
    }
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

export default router;
