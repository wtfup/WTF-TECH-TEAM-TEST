// Canonical header mapping across the sample's three sheet variants
// (job_board / referrals / events — see sample-data/generate-candidates.js).
export const HEADER_MAP: Record<string, string> = {
  // name
  name: "full_name",
  "full name": "full_name",
  "candidate name": "full_name",
  candidate: "full_name",
  first: "first_name",
  last: "last_name",

  // email
  email: "email",
  "email address": "email",
  "e-mail": "email",
  mail: "email",

  // phone
  mobile: "phone",
  phone: "phone",
  "phone number": "phone",
  contact: "phone",

  // skills
  skills: "skills",
  "tech stack": "skills",
  tech: "skills",
  expertise: "skills",

  // experience
  experience: "experience_years",
  years: "experience_years",
  yoe: "experience_years",
  exp: "experience_years",

  // location
  location: "location",
  city: "location",
  "based in": "location",
  region: "location",
};

export function normalizeHeader(header: string) {
  return HEADER_MAP[header.trim().toLowerCase()] || header;
}
