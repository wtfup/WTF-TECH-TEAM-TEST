import { describe, it, expect } from "vitest";
import { normalizeHeader } from "./headerMap";

// README §4 — header mapping across the three sheet variants.
describe("normalizeHeader", () => {
  it("maps name-column variants across all three sheets to full_name", () => {
    expect(normalizeHeader("Name")).toBe("full_name"); // sheet A/generic
    expect(normalizeHeader("Full Name")).toBe("full_name"); // job_board
    expect(normalizeHeader("Candidate Name")).toBe("full_name");
    expect(normalizeHeader("candidate")).toBe("full_name"); // referrals
  });

  it("maps the events-sheet split name columns", () => {
    expect(normalizeHeader("first")).toBe("first_name");
    expect(normalizeHeader("last")).toBe("last_name");
  });

  it("maps email-column variants across all three sheets to email", () => {
    expect(normalizeHeader("Email Address")).toBe("email"); // job_board
    expect(normalizeHeader("e-mail")).toBe("email"); // referrals
    expect(normalizeHeader("mail")).toBe("email"); // events
  });

  it("maps phone-column variants to phone", () => {
    expect(normalizeHeader("Mobile")).toBe("phone");
    expect(normalizeHeader("phone number")).toBe("phone");
    expect(normalizeHeader("contact")).toBe("phone");
  });

  it("maps skills-column variants to skills", () => {
    expect(normalizeHeader("Skills")).toBe("skills"); // job_board
    expect(normalizeHeader("tech")).toBe("skills"); // referrals
    expect(normalizeHeader("expertise")).toBe("skills"); // events
  });

  it("maps experience-column variants to experience_years", () => {
    expect(normalizeHeader("Experience")).toBe("experience_years"); // job_board
    expect(normalizeHeader("yoe")).toBe("experience_years"); // referrals
    expect(normalizeHeader("exp")).toBe("experience_years"); // events
  });

  it("maps location-column variants to location", () => {
    expect(normalizeHeader("City")).toBe("location"); // job_board
    expect(normalizeHeader("based in")).toBe("location"); // referrals
    expect(normalizeHeader("region")).toBe("location"); // events
  });

  it("is case-insensitive and trims whitespace", () => {
    expect(normalizeHeader("  EMAIL  ")).toBe("email");
    expect(normalizeHeader("full name")).toBe("full_name");
  });

  it("passes unknown headers through unchanged (preserved as raw)", () => {
    expect(normalizeHeader("LinkedIn")).toBe("LinkedIn");
    expect(normalizeHeader("Source")).toBe("Source");
  });
});
