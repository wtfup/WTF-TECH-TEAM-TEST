export type MappedCandidate = {
  name: string | null;
  email: string | null;
  phone: string | null;
  skills: string[];
  years_of_experience: number | null;
  seniority: string | null;
  location: string | null;
};

function cleanStr(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function normalizeEmail(v: unknown): string | null {
  const s = cleanStr(v);
  return s ? s.toLowerCase() : null;
}

function normalizeLocation(v: unknown): string | null {
  const s = cleanStr(v);
  if (!s) return null;
  const t = s.trim().toLowerCase();
  if (t === "bangalore" || t === "bengaluru") return "Bengaluru";
  return s.trim().replace(/\s+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function parseSkills(v: unknown): string[] {
  const s = cleanStr(v);
  if (!s) return [];
  return s
    .split(/[;,|]/)
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
}

function parseExperience(v: unknown): { years: number | null; seniority: string | null } {
  const s = cleanStr(v);
  if (!s) return { years: null, seniority: null };
  const lower = s.toLowerCase();

  if (lower.includes("fresher")) return { years: 0, seniority: "junior" };

  const match = lower.match(/(\d+)/);
  const years = match ? parseInt(match[1], 10) : null;

  let seniority: string | null = null;
  if (years !== null) {
    seniority = years >= 7 ? "senior" : years >= 3 ? "mid" : "junior";
  } else if (lower.includes("senior")) {
    seniority = "senior";
  }

  return { years, seniority };
}

export function mapRow(raw: Record<string, any>): MappedCandidate | null {
  const keys = Object.keys(raw).map((k) => k.toLowerCase());
  if (keys.length === 0) return null; // fully blank row

  if ("full name" in lowerKeys(raw) || "email address" in lowerKeys(raw)) {
    const r = lowerKeys(raw);
    const { years, seniority } = parseExperience(r["experience"]);
    return {
      name: cleanStr(r["full name"]),
      email: normalizeEmail(r["email address"]),
      phone: cleanStr(r["mobile"]),
      skills: parseSkills(r["skills"]),
      years_of_experience: years,
      seniority,
      location: normalizeLocation(r["city"]),
    };
  }

  if ("candidate" in lowerKeys(raw) || "e-mail" in lowerKeys(raw)) {
    const r = lowerKeys(raw);
    const { years, seniority } = parseExperience(r["yoe"]);
    return {
      name: cleanStr(r["candidate"]),
      email: normalizeEmail(r["e-mail"]),
      phone: cleanStr(r["phone number"]),
      skills: parseSkills(r["tech"]),
      years_of_experience: years,
      seniority,
      location: normalizeLocation(r["based in"]),
    };
  }

  if ("first" in lowerKeys(raw) || "mail" in lowerKeys(raw)) {
    const r = lowerKeys(raw);
    const { years, seniority } = parseExperience(r["exp"]);
    const first = cleanStr(r["first"]);
    const last = cleanStr(r["last"]);
    return {
      name: [first, last].filter(Boolean).join(" ") || null,
      email: normalizeEmail(r["mail"]),
      phone: cleanStr(r["contact"]),
      skills: parseSkills(r["expertise"]),
      years_of_experience: years,
      seniority,
      location: normalizeLocation(r["region"]),
    };
  }

  return null; 
}

function lowerKeys(raw: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k.trim().toLowerCase()] = v;
  }
  return out;
}