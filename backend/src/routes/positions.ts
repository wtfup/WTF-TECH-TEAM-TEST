import { Router } from "express";
import { pool } from "../db";
import { scoreMatch } from "../services/scoring";

const router = Router();

// List all open positions.
router.get("/", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM positions ORDER BY title ASC`
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch positions" });
  }
});

// Single position.
router.get("/:id", async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT * FROM positions WHERE id = $1`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: "Position not found" });
    }
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch position" });
  }
});

// Rank candidates for a position, high -> low (README §2.4 canonical view).
router.get("/:id/matches", async (req, res) => {
  try {
    const positionResult = await pool.query(
      `SELECT * FROM positions WHERE id = $1`,
      [req.params.id]
    );

    if (positionResult.rows.length === 0) {
      return res.status(404).json({ error: "Position not found" });
    }

    const position = positionResult.rows[0];
    const required: string[] = position.required_skills || [];

    // Shortlist via the GIN index: only candidates sharing >=1 required skill,
    // ordered by overlap, capped — so ranking stays sub-second at 100k+ rows
    // instead of scoring every candidate in Node (see ARCHITECTURE.md §6).
    const candidateResult = await pool.query(
      `
      SELECT id, name, email, skills, years_of_experience, seniority, location
      FROM candidates
      ${required.length ? "WHERE skills && $1::text[]" : ""}
      ${required.length
        ? `ORDER BY cardinality(ARRAY(SELECT unnest(skills) INTERSECT SELECT unnest($1::text[]))) DESC`
        : "ORDER BY created_at DESC"}
      LIMIT 500
      `,
      required.length ? [required] : []
    );

    const matches = candidateResult.rows.map((candidate) => {
      const result = scoreMatch({
        candidateSkills: candidate.skills,
        candidateYears: candidate.years_of_experience,
        candidateLocation: candidate.location,
        requiredSkills: position.required_skills,
        minExperience: position.min_experience,
        positionLocation: position.location,
        remote: position.remote,
      });

      return {
        candidateId: candidate.id,
        name: candidate.name,
        email: candidate.email,
        seniority: candidate.seniority,
        ...result,
      };
    });

    // Deterministic ordering: score desc, then candidate id asc for stable ties.
    matches.sort((a, b) => b.score - a.score || a.candidateId - b.candidateId);

    res.json({ position, matches });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch matches" });
  }
});

export default router;
