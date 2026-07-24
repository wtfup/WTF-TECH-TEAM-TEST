// Single source of truth for the match score (README §2.4).
//
//   skills      60%   (matched required skills / total required skills)
//   experience  20%   (candidate years >= position min_experience)
//   location    20%   (position remote, or same location)
//
// The "why" is derived from the same values that produce the score, so the
// explanation can never disagree with the number. Formula is documented in
// ARCHITECTURE.md §3.

export type ScoreInput = {
  candidateSkills: string[];
  candidateYears: number;
  candidateLocation: string;
  requiredSkills: string[];
  minExperience: number;
  positionLocation: string;
  remote: boolean;
};

export type ScoreResult = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  experienceMatched: boolean;
  locationMatched: boolean;
  why: string[];
};

function norm(list: any): string[] {
  return (Array.isArray(list) ? list : [])
    .map((s) => String(s).toLowerCase().trim())
    .filter(Boolean);
}

export function scoreMatch(input: ScoreInput): ScoreResult {
  const candidateSkills = norm(input.candidateSkills);
  const requiredSkills = norm(input.requiredSkills);

  const matchedSkills = requiredSkills.filter((s) =>
    candidateSkills.includes(s)
  );
  const missingSkills = requiredSkills.filter(
    (s) => !candidateSkills.includes(s)
  );

  const skillScore =
    requiredSkills.length === 0
      ? 0
      : (matchedSkills.length / requiredSkills.length) * 60;

  const experienceMatched =
    Number(input.candidateYears) >= Number(input.minExperience);
  const experienceScore = experienceMatched ? 20 : 0;

  const locationMatched =
    !!input.remote ||
    String(input.candidateLocation ?? "").toLowerCase().trim() ===
      String(input.positionLocation ?? "").toLowerCase().trim();
  const locationScore = locationMatched ? 20 : 0;

  const score = Math.round(skillScore + experienceScore + locationScore);

  const why: string[] = [
    `Matched ${matchedSkills.length} of ${requiredSkills.length} required skills`,
    experienceMatched
      ? "Experience requirement satisfied"
      : `Requires ${input.minExperience}+ years experience`,
    locationMatched ? "Location matched" : "Location does not match",
  ];

  return {
    score,
    matchedSkills,
    missingSkills,
    experienceMatched,
    locationMatched,
    why,
  };
}
