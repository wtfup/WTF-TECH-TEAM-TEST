type CandidateRow = Record<string, any>;

export interface EnrichedCandidate {
  email: string;
  full_name: string;
  phone: string;
  location: string;
  skills: string[];
  experience_years: number | null;
  seniority: string;

  [key: string]: any;
}

const skillAliases: Record<string, string> = {
  react: "react",
  reactjs: "react",

  node: "node.js",
  "node js": "node.js",
  "node.js": "node.js",

  postgres: "postgres",
  postgresql: "postgres",

  js: "javascript",
  javascript: "javascript",

  ts: "typescript",
  typescript: "typescript",

  aws: "aws",
  docker: "docker",
};

function normalizeSkills(skills: any): string[] {
  if (!skills) return [];

  // Sheets use mixed delimiters — comma, semicolon, or pipe (see
  // sample-data/generate-candidates.js). Split on all three, not just comma,
  // or two-thirds of the sample collapses into one un-splittable blob.
  const arr =
    typeof skills === "string"
      ? skills.split(/[;,|]/)
      : Array.isArray(skills)
      ? skills
      : [];

  const normalized = arr
    .map((skill) => {
      const key = String(skill).trim().toLowerCase();
      return skillAliases[key] || key;
    })
    .filter(Boolean); // drop blanks from trailing/adjacent delimiters

  return [...new Set(normalized)];
}

function normalizeName(name: string): string {
  if (!name) return "";

  return name
    .trim()
    .split(/\s+/)
    .map(
      (word) =>
        word.charAt(0).toUpperCase() +
        word.slice(1).toLowerCase()
    )
    .join(" ");
}

function normalizeLocation(location: string): string {
  if (!location) return "";

  return location
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function normalizePhone(phone: any): string {
  const digits = String(phone ?? "").replace(/[^\d+]/g, "");
  return digits;
}

// Some sheets carry a single name column; the "events" sheet splits it into
// first/last. Prefer an explicit full name, else compose it.
function resolveFullName(row: CandidateRow): string {
  const explicit = normalizeName(String(row.full_name ?? ""));
  if (explicit) return explicit;
  const composed = `${row.first_name ?? ""} ${row.last_name ?? ""}`.trim();
  return normalizeName(composed);
}

function calculateSeniority(years: number | null): string {
  if (years == null) return ""; // unknown — kept blank so a merge/NULLIF never overwrites a known value
  if (years <= 2) return "Junior";
  if (years <= 5) return "Mid-Level";
  return "Senior";
}

// Experience may arrive as a number, "3", "3 years", "fresher", or junk.
// Distinguish a *known* zero ("fresher") from *unknown* (blank / junk): known
// zero → 0 (Junior); unknown → null, so a blank re-upload can never blank a
// populated value via the COALESCE merge. Never NaN (would slide into "Senior").
function parseExperience(value: any): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const s = String(value ?? "").trim().toLowerCase();

  if (s === "fresher" || s === "fresh") return 0; // known: zero experience
  if (!s || s === "n/a") return null; // unknown: do not fabricate a value

  const match = s.match(/\d+(\.\d+)?/);
  return match ? Number(match[0]) : null; // junk with no number → unknown, not 0
}

export function enrichCandidate(
  row: CandidateRow
): EnrichedCandidate {
  const years = parseExperience(row.experience_years);

  return {
    ...row,

    email: String(row.email ?? "")
      .trim()
      .toLowerCase(),

    full_name: resolveFullName(row),

    phone: normalizePhone(row.phone),

    location: normalizeLocation(String(row.location ?? "")),

    skills: normalizeSkills(row.skills),

    experience_years: years,

    seniority: calculateSeniority(years),
  };
}