import { describe, it, expect } from "vitest";
import { enrichCandidate } from "./enrichment.service";

// README §2.3 — deterministic, rule-based enrichment.
describe("enrichCandidate", () => {
  it("normalizes email (lowercase + trim) and name (title case)", () => {
    const c = enrichCandidate({ email: "  Asha@X.COM ", full_name: "asha  rao" });
    expect(c.email).toBe("asha@x.com");
    expect(c.full_name).toBe("Asha Rao");
  });

  it("splits, de-aliases and de-duplicates skills", () => {
    const c = enrichCandidate({ skills: "React, reactjs, NODE, node" });
    expect(c.skills).toEqual(["react", "node.js"]);
  });

  it("splits skills on semicolons and pipes too, not only commas", () => {
    expect(enrichCandidate({ skills: "REACT; NODE.JS; POSTGRES" }).skills).toEqual([
      "react",
      "node.js",
      "postgres",
    ]);
    expect(enrichCandidate({ skills: "react | node.js | postgres" }).skills).toEqual([
      "react",
      "node.js",
      "postgres",
    ]);
  });

  it("treats 'fresher' as 0 years → Junior (never NaN → Senior)", () => {
    const c = enrichCandidate({ experience_years: "fresher" });
    expect(c.experience_years).toBe(0);
    expect(c.seniority).toBe("Junior");
  });

  it("treats blank/junk experience as unknown (null), not a fabricated 0", () => {
    // null (not 0) so a blank re-upload can never blank a populated value via COALESCE
    expect(enrichCandidate({ experience_years: "" }).experience_years).toBeNull();
    expect(enrichCandidate({ experience_years: "???" }).experience_years).toBeNull();
    expect(enrichCandidate({ experience_years: "" }).seniority).toBe("");
  });

  it("extracts a number from messy experience like '3 years'", () => {
    const c = enrichCandidate({ experience_years: "3 years" });
    expect(c.experience_years).toBe(3);
    expect(c.seniority).toBe("Mid-Level");
  });

  it("classifies senior experience", () => {
    expect(enrichCandidate({ experience_years: 8 }).seniority).toBe("Senior");
  });

  it("composes full_name from split first/last columns (events sheet)", () => {
    const c = enrichCandidate({ first_name: "aarav", last_name: "sharma" });
    expect(c.full_name).toBe("Aarav Sharma");
  });

  it("normalizes phone to digits", () => {
    const c = enrichCandidate({ phone: "+91 98-000 12345" });
    expect(c.phone).toBe("+919800012345");
  });

  it("preserves unknown columns for the raw blob", () => {
    const c = enrichCandidate({ email: "a@b.com", full_name: "A B", LinkedIn: "x/y" });
    expect(c.LinkedIn).toBe("x/y");
  });

  it("is deterministic for identical input", () => {
    const input = { email: "a@b.com", full_name: "A B", skills: "ts,js", experience_years: 4 };
    expect(enrichCandidate({ ...input })).toEqual(enrichCandidate({ ...input }));
  });
});
