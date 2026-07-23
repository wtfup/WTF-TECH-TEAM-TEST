# Sample data

Starter assets for the take-home. See the root [`README.md`](../README.md) for
the full spec.

## Files

- **`positions.json`** — the open roles. Seed these into your DB and match
  candidates against them (root README §2.4). Shape:
  `{ id, title, required_skills[], min_experience, location, remote }`.

- **`generate-candidates.js`** — generates a **deliberately messy** `.xlsx` of
  candidates so you can build your ingestion pipeline against realistic ugliness.

## Generating candidate data

```bash
cd sample-data
npm init -y && npm i xlsx
node generate-candidates.js 500        # -> candidates-sample.xlsx  (small, fine to commit)
node generate-candidates.js 100000     # -> candidates-large.xlsx   (SCALE TEST — do NOT commit)
```

## The mess is intentional

Your pipeline (root README §2.2) must survive all of this:

- **Three sheets, three different header sets** (`job_board`, `referrals`,
  `events`) — forces header mapping, not a single fixed schema.
- **Inconsistent headers** — `Full Name` / `candidate` / `first`+`last`,
  `Email Address` / `e-mail` / `mail`, `Skills` / `tech` / `expertise`, etc.
- **Duplicates** — the same person recurs across sheets with different
  casing/whitespace in the email. Dedup + merge to one record.
- **Blank rows** (~8%), **missing emails** (~5%), **malformed cells** (~3%,
  e.g. phone = `"not-a-number"`).
- **Mixed skill separators & casing** — `; `, `, `, ` | `, upper/lower.
- **Unknown columns** (`Source`, `Notes`, `linkedin`, `event`) — keep them in
  a `raw` JSONB blob, don't silently drop them.

If your ingest cleanly turns this into deduped, enriched, queryable candidate
records with a truthful job report, you've nailed the core of the test.

> **Do not commit `candidates-large.xlsx`.** The repo's `.gitignore` already
> excludes it.
