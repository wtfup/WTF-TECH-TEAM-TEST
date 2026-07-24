import { EnrichedCandidate } from "./enrichment.service";

// Merge two records for the same person. The rule (mirrored by the SQL upsert in
// ingest.service): never overwrite a populated field with a blank (README §2.2).
export function mergeCandidate(
  base: EnrichedCandidate,
  incoming: EnrichedCandidate
): EnrichedCandidate {
  return {
    ...base,
    ...incoming,
    email: base.email,
    full_name: incoming.full_name || base.full_name,
    phone: incoming.phone || base.phone,
    location: incoming.location || base.location,
    seniority: incoming.seniority || base.seniority,
    skills: incoming.skills && incoming.skills.length ? incoming.skills : base.skills,
    experience_years:
      incoming.experience_years != null ? incoming.experience_years : base.experience_years,
  };
}

// Collapse duplicate emails within a single batch/file, merging their fields so
// two rows for the same person (e.g. different casing) become one complete row.
export function dedupeByEmail(items: EnrichedCandidate[]): EnrichedCandidate[] {
  const byEmail = new Map<string, EnrichedCandidate>();
  for (const item of items) {
    if (!item.email) continue;
    const existing = byEmail.get(item.email);
    byEmail.set(item.email, existing ? mergeCandidate(existing, item) : item);
  }
  return [...byEmail.values()];
}
