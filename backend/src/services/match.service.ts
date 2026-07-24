import { pool } from "../db";
import { scoreMatch } from "./scoring";

// Rank all open positions for a single candidate (candidate detail view).
export async function findMatches(candidateId: number) {
  const candidateResult = await pool.query(
    `SELECT * FROM candidates WHERE id = $1`,
    [candidateId]
  );

  if (candidateResult.rowCount === 0) {
    throw new Error("Candidate not found");
  }

  const candidate = candidateResult.rows[0];

  const positionResult = await pool.query(`SELECT * FROM positions`);

  const matches = positionResult.rows.map((position) => {
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
      positionId: position.id,
      positionTitle: position.title,
      ...result,
    };
  });

  // Deterministic ordering: score desc, then position id asc for stable ties.
  matches.sort(
    (a, b) => b.score - a.score || String(a.positionId).localeCompare(String(b.positionId))
  );

  return matches;
}
