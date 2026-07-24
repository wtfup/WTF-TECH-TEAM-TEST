# PLAN — TalentMatch

Written before the build, kept honest as the build moved. This is the map: what the
schema looks like, what order I built in, and — most importantly — **where I drew the
cut line and why**. Per §8, a narrow solid slice beats a broad half-built five, so this
document commits to the narrow slice up front.

---

## The cut line (one sentence)

**Build Google auth + a correct, deduped, streaming ingestion pipeline + enrichment + a
working match score + idempotent email — prioritizing a data model that never
double-sends and never blanks a populated field over breadth.**

> **Status (kept honest as the build moved):** the original cut line deferred the
> streaming parser, the async job path, and the dedicated frontend routes. The build
> reached all of them — ingestion now streams multi-sheet workbooks, lands rows in
> batches behind a `202 {jobId}` async job, and the seven routes ship. What's genuinely
> still cut is listed at the end. Current, measured state lives in
> [`ARCHITECTURE.md`](./ARCHITECTURE.md); this file keeps the original reasoning.

Everything below either sits **inside** that line (built) or **outside** it (cut, with a
note on how it would be built). Nothing is a silent half-wired stub — `ingest_jobs` and
`ingest_failures` are now fully written by the ingest path.

---

## Schema sketch

Six tables, all created via numbered migrations in `backend/migrations/` (no hand-run
SQL). Types are Postgres.

```
users                       -- populated by the Google OAuth flow (§2.1)
  id           bigserial pk
  google_id    text unique not null
  email        text unique not null
  name         text
  avatar_url   text
  created_at   timestamptz

candidates                  -- the core entity (§2.2, §2.3, §5)
  id                   bigserial pk
  email                text unique          -- dedup key; normalized lower+trim before write
  name                 text not null
  phone                text                 -- reserved for the name+phone fallback dedup (CUT)
  skills               text[]               -- enriched, normalized, de-aliased
  years_of_experience  integer
  seniority            text                 -- derived: Junior / Mid-Level / Senior
  location             text
  raw                  jsonb                -- unknown/extra columns preserved verbatim
  source_file          text
  created_at, updated_at timestamptz
  INDEX gin(skills)                         -- skill lookups
  INDEX (name), (location)
  -- email uniqueness gives an implicit btree index on the dedup key

positions                   -- seeded from sample-data/positions.json (§2.4)
  id                text pk
  title             text not null
  required_skills   text[]
  min_experience    integer
  location          text
  remote            boolean
  INDEX gin(required_skills), (location)

ingest_jobs                 -- SCHEMA PRESENT, WRITE PATH CUT (see below)
  id, filename, status, total_rows, processed_rows,
  inserted, merged, failed, error, created_at, finished_at

ingest_failures             -- SCHEMA PRESENT, WRITE PATH CUT (see below)
  id, job_id fk, row_number, raw jsonb, reason, created_at

email_sends                 -- idempotency ledger (§2.5)
  id, position_id fk, candidate_id fk, status, error, sent_at, created_at
  UNIQUE (position_id, candidate_id)        -- the idempotency guarantee, at the DB level
```

**Dedup / merge rule (the line most submissions get wrong):**
dedup on normalized email (`lower(trim(email))`), `INSERT ... ON CONFLICT (email) DO
UPDATE`. The merge must **never overwrite a populated field with a blank** — target state
is `COALESCE(NULLIF(EXCLUDED.x,''), candidates.x)` per column. (See ARCHITECTURE.md for
where the current code falls short of this and the exact fix.)

---

## Build order (priority, highest first)

1. **Auth first (§2.1).** Nothing is demoable behind a login that doesn't work, so Google
   OAuth + session + `users` table came before any feature. Committed as its own step.
2. **Schema + migrations.** All six tables up front so the write paths have somewhere to
   land. Designing `ingest_jobs`/`ingest_failures`/`email_sends` now (even where the write
   path is later cut) keeps the data model coherent.
3. **Ingestion (§2.2) — the heaviest feature by intent.** Header mapping → enrichment →
   deduped upsert. This is where correctness matters most (dedup, merge-without-blanking,
   failure accounting), so it gets the most care.
4. **Enrichment (§2.3).** Pure, deterministic, rule-based (no LLM): normalize name, split
   + de-alias skills, derive seniority from experience.
5. **Matching (§2.4).** Transparent 60/20/20 score (skills / experience / location) with a
   human-readable "why".
6. **Email (§2.5).** Bulk send through Mailhog, made idempotent by the
   `UNIQUE(position_id, candidate_id)` ledger.

---

## Inside the cut line — BUILT

- Google OAuth login, session persistence, `/me`, logout; all resource endpoints behind
  an `ensureAuth` 401 guard.
- Migrations for all six tables + the indexes above.
- **Streaming, multi-sheet** ingestion (`services/ingest.service.ts`) with header mapping
  across the three sheet variants (`utils/headerMap.ts`), **batched upserts** (~1000/row
  statement), in-file dedup, and a per-row fallback that isolates bad rows.
- **Async ingest job**: `202 {jobId}`, background processing, progress + inserted/merged/
  failed in `ingest_jobs`, per-row reasons in `ingest_failures` (`GET /upload/:id[/failures]`).
- Deterministic rule-based enrichment (`services/enrichment.service.ts`).
- Deduped upsert on normalized email; merge **never blanks a populated field** (COALESCE);
  inserted-vs-merged via `RETURNING (xmax = 0)`. Unknown columns preserved in `raw` (JSONB).
- 60/20/20 match scorer with a "why" (`services/scoring.ts`), both directions, deterministic
  tie-break; position→candidates shortlisted via the GIN index.
- Idempotent bulk email (`UNIQUE(position_id, candidate_id)`), failures recorded + retried,
  personalized with name fallback + matched skills.
- Seven routed frontend pages (loading/empty/error states), server-paginated candidates,
  multi-select bulk email with confirm + summary.
- `vitest` unit tests: header mapping, dedup/merge, scorer, email idempotency. Seed loads
  `sample-data/positions.json`.

## Outside the cut line — still DEFERRED (and how each would be built)

1. **Name+phone fallback dedup.** `phone` is now captured, but email-less rows still fail
   rather than matching on `lower(trim(name))` + normalized phone. That fallback is the gap.
2. **Separate worker / queue.** Background ingest is in-process (fire-and-forget) — correct
   for one node; a multi-instance deploy wants a real queue (BullMQ/pg-boss) + worker.
3. **Pushed progress + keyset pagination.** Progress is polled (not pushed) and the list
   uses OFFSET; SSE/WebSocket and keyset pagination are the scale refinements.

---

## Verified (measured locally, Postgres 16)

- 100k-row / 35 MB messy 3-sheet workbook ingested in **25.5 s** at **peak RSS 125 MB**
  (under a 512 MB heap cap — memory stays bounded, not linear).
- Re-ingesting the same file → **0 inserted** (all merged); row accounting exact.
- Merge preserves populated fields against a blank second upload; failures land in
  `ingest_failures` with reasons.

The original "known gaps" (EXCLUDED-not-COALESCE merge, inserted miscount, one-direction
matching) were the fixes this build landed — kept in git history rather than hidden here.
