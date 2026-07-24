import { describe, it, expect } from "vitest";
import { mergeCandidate, dedupeByEmail } from "./merge";
import { EnrichedCandidate } from "./enrichment.service";

function make(over: Partial<EnrichedCandidate>): EnrichedCandidate {
  return {
    email: "a@b.com",
    full_name: "Asha Rao",
    phone: "",
    location: "Bangalore",
    skills: ["react"],
    experience_years: 4,
    seniority: "Mid-Level",
    ...over,
  };
}

// README §2.2 — dedup + merge (never overwrite a populated field with a blank).
describe("mergeCandidate", () => {
  it("does not overwrite populated fields with blanks", () => {
    const base = make({ full_name: "Asha Rao", location: "Bangalore", skills: ["react"] });
    const incoming = make({ full_name: "", location: "", skills: [] });
    const merged = mergeCandidate(base, incoming);
    expect(merged.full_name).toBe("Asha Rao");
    expect(merged.location).toBe("Bangalore");
    expect(merged.skills).toEqual(["react"]);
  });

  it("takes populated incoming values over the base", () => {
    const base = make({ location: "Bangalore" });
    const incoming = make({ location: "Pune", skills: ["react", "node.js"] });
    const merged = mergeCandidate(base, incoming);
    expect(merged.location).toBe("Pune");
    expect(merged.skills).toEqual(["react", "node.js"]);
  });

  it("does not blank a populated experience with an unknown (null) incoming", () => {
    const base = make({ experience_years: 5, seniority: "Mid-Level" });
    const incoming = make({ experience_years: null, seniority: "" });
    const merged = mergeCandidate(base, incoming);
    expect(merged.experience_years).toBe(5);
    expect(merged.seniority).toBe("Mid-Level");
  });

  it("still takes a known zero ('fresher') over a populated base", () => {
    const base = make({ experience_years: 5 });
    const incoming = make({ experience_years: 0 });
    expect(mergeCandidate(base, incoming).experience_years).toBe(0);
  });
});

describe("dedupeByEmail", () => {
  it("collapses duplicate emails within a batch into one merged record", () => {
    const rows = [
      make({ email: "a@b.com", full_name: "Asha Rao", skills: ["react"] }),
      make({ email: "a@b.com", full_name: "", skills: ["node.js"] }),
    ];
    const out = dedupeByEmail(rows);
    expect(out).toHaveLength(1);
    expect(out[0].full_name).toBe("Asha Rao"); // blank didn't win
    expect(out[0].skills).toEqual(["node.js"]); // populated incoming won
  });

  it("keeps distinct emails separate", () => {
    const out = dedupeByEmail([make({ email: "a@b.com" }), make({ email: "c@d.com" })]);
    expect(out).toHaveLength(2);
  });
});
