#!/usr/bin/env node
/*
 * generate-candidates.js — produces a DELIBERATELY MESSY .xlsx of candidates.
 *
 * The mess is intentional. Your ingestion pipeline (README §2.2) is expected to
 * survive all of it: inconsistent headers, duplicate people, blank rows,
 * malformed cells, mixed casing/whitespace, and unknown extra columns.
 *
 * Usage:
 *   npm i xlsx
 *   node generate-candidates.js 500       -> candidates-sample.xlsx (small, commit-able)
 *   node generate-candidates.js 100000    -> candidates-large.xlsx  (scale test, DO NOT COMMIT)
 *
 * Rows are written across MULTIPLE sheets with DIFFERENT header sets on purpose,
 * so you exercise header-mapping (README §2.2) — not just one clean schema.
 */

const XLSX = require("xlsx");

const COUNT = parseInt(process.argv[2] || "500", 10);
const OUT = COUNT > 5000 ? "candidates-large.xlsx" : "candidates-sample.xlsx";

// --- deterministic-ish pools (no Math.random seeding needed for a test asset) ---
const FIRST = ["Aarav","Sneha","Rahul","Priya","Vikram","Ananya","Karan","Isha",
  "Rohan","Meera","Arjun","Divya","Sachin","Neha","Amit","Pooja","Nikhil","Riya",
  "Sameer","Kavya","John","Emily","Wei","Chen","Fatima","Omar","Lucas","Sofia"];
const LAST = ["Sharma","Patel","Reddy","Nair","Gupta","Singh","Iyer","Das","Khan",
  "Mehta","Rao","Bose","Pandey","Joshi","Kumar","Verma","Shah","Roy","Menon","Pillai"];
const SKILLS = ["react","node.js","typescript","javascript","postgres","redis","docker",
  "kubernetes","aws","python","go","java","css","redux","jest","kafka","spark","airflow",
  "terraform","ci/cd","graphql","mongodb","next.js","tailwind"];
const CITIES = ["Bengaluru","bangalore","Mumbai","Delhi","Pune","Hyderabad","Remote",
  "  Chennai ","BENGALURU","Gurgaon","Noida"];
const EXP = ["5+ yrs","3 years","fresher","7","2 yr","4 years exp","10+","1","6yrs","", "senior (8)"];

const pick = (arr, i) => arr[i % arr.length];
const rnd = (n, seed) => (seed * 9301 + 49297) % 233280 % n; // cheap deterministic spread

function fullName(i) {
  return `${pick(FIRST, i)} ${pick(LAST, i * 7 + 3)}`;
}
function email(i, name) {
  const base = name.toLowerCase().replace(/\s+/g, ".");
  // vary casing / whitespace / domains to force normalization
  const domains = ["gmail.com", "Gmail.com", "outlook.com", "wtfgyms.com", "yahoo.com"];
  const pad = i % 5 === 0 ? "  " : ""; // some leading/trailing space
  return `${pad}${i % 4 === 0 ? base.toUpperCase() : base}@${pick(domains, i)}${pad}`;
}
function skillsBlob(i) {
  const n = 2 + (i % 5);
  const s = [];
  for (let k = 0; k < n; k++) s.push(pick(SKILLS, i * 3 + k * 5));
  // mixed separators + casing to force parsing
  const sep = i % 3 === 0 ? "; " : i % 3 === 1 ? ", " : " | ";
  return (i % 2 ? s.map((x) => x.toUpperCase()) : s).join(sep);
}

// Build three record shapes with DIFFERENT headers -> three sheets.
const sheetA = []; // job-board export style
const sheetB = []; // referral sheet style
const sheetC = []; // event sign-up style

for (let i = 0; i < COUNT; i++) {
  const name = fullName(i);
  const mail = email(i, name);

  // ~8% blank rows, ~5% missing email, ~3% malformed
  const blank = i % 13 === 0;
  const noEmail = i % 20 === 0;
  const malformed = i % 33 === 0;

  if (blank) { sheetA.push({}); continue; }

  const target = i % 3;
  if (target === 0) {
    sheetA.push({
      "Full Name": name,
      "Email Address": noEmail ? "" : mail,
      "Mobile": malformed ? "not-a-number" : `+91${9000000000 + (i % 999999999)}`,
      "Skills": skillsBlob(i),
      "Experience": pick(EXP, i),
      "City": pick(CITIES, i),
      "Source": "naukri-export",          // unknown column -> keep in raw JSONB
      "Notes": i % 7 === 0 ? "referred by hiring manager" : ""
    });
  } else if (target === 1) {
    sheetB.push({
      "candidate": name,
      "e-mail": noEmail ? "" : mail,
      "phone number": `98${(10000000 + i) % 99999999}`,
      "tech": skillsBlob(i),
      "yoe": pick(EXP, i * 2),
      "based in": pick(CITIES, i * 2),
      "linkedin": `https://linkedin.com/in/${name.toLowerCase().replace(/\s+/g, "-")}`
    });
  } else {
    // deliberately introduce DUPLICATES: reuse an earlier person's email
    const dupIdx = i % 5 === 0 ? Math.max(0, i - 4) : i;
    const dName = fullName(dupIdx);
    sheetC.push({
      "first": dName.split(" ")[0],
      "last": dName.split(" ")[1],
      "mail": email(dupIdx, dName),
      "contact": `07${(1000000 + i) % 9999999}`,
      "expertise": skillsBlob(dupIdx),
      "exp": pick(EXP, dupIdx),
      "region": pick(CITIES, dupIdx),
      "event": "campus-drive-2026"
    });
  }
}

const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetA), "job_board");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetB), "referrals");
XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheetC), "events");
XLSX.writeFile(wb, OUT);

const total = sheetA.length + sheetB.length + sheetC.length;
console.log(`Wrote ${OUT}`);
console.log(`  ~${total} rows across 3 sheets with different headers`);
console.log(`  includes blank rows, missing emails, malformed cells, and intentional duplicates`);
if (COUNT > 5000) console.log(`  NOTE: this is the scale-test file — DO NOT commit it.`);
