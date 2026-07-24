import { describe, it, expect } from "vitest";
import { scoreMatch } from "./scoring";

const base = {
  candidateSkills: ["react", "node.js"],
  candidateYears: 5,
  candidateLocation: "Bangalore",
  requiredSkills: ["react", "node.js"],
  minExperience: 3,
  positionLocation: "Bangalore",
  remote: false,
};

// README §2.4 — 60/20/20 scorer.
describe("scoreMatch", () => {
  it("scores a full match at 100", () => {
    expect(scoreMatch(base).score).toBe(100);
  });

  it("scales the skill component (60%) by matched fraction", () => {
    const r = scoreMatch({ ...base, candidateSkills: ["react"] });
    // 1/2 skills * 60 = 30, + 20 exp + 20 location = 70
    expect(r.score).toBe(70);
    expect(r.matchedSkills).toEqual(["react"]);
    expect(r.missingSkills).toEqual(["node.js"]);
  });

  it("drops experience points when under the minimum", () => {
    const r = scoreMatch({ ...base, candidateYears: 1 });
    expect(r.experienceMatched).toBe(false);
    expect(r.score).toBe(80); // 60 skills + 0 exp + 20 location
  });

  it("awards location points for remote regardless of city", () => {
    const r = scoreMatch({ ...base, candidateLocation: "Delhi", remote: true });
    expect(r.locationMatched).toBe(true);
    expect(r.score).toBe(100);
  });

  it("produces a truthful why derived from the same values", () => {
    const r = scoreMatch({ ...base, candidateSkills: ["react"] });
    expect(r.why[0]).toBe("Matched 1 of 2 required skills");
    expect(r.why).toContain("Experience requirement satisfied");
    expect(r.why).toContain("Location matched");
  });

  it("handles a position with no required skills without dividing by zero", () => {
    const r = scoreMatch({ ...base, requiredSkills: [] });
    expect(r.score).toBe(40); // 0 skills + 20 exp + 20 location
  });
});
