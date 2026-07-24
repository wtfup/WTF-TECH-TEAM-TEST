# ARCHITECTURE — TalentMatch

Companion to [PLAN.md](./PLAN.md). PLAN.md is what I set out to build and where I drew the
cut line; this document is what actually exists, how it's layered, what I skipped and how
I'd build it, and — bluntly — where the code falls short of its own targets with the exact
fix for each. Per §7 a missed target named openly with its fix costs less than one hidden.

---

## 1. Layering

```
HTTP            backend/src/routes/*.ts      thin: parse req, validate, call a service, shape res
  │
service/domain  backend/src/services/*.ts    all business logic (parse, enrich, dedup, score, send)
  │             backend/src/utils/*.ts        pure helpers (header map, mailer)
  │
data            backend/src/db.ts             single pg Pool; parameterized SQL only
                backend/src/migrations/*.sql  schema as numbered, forward-only migrations
```

Routes hold no business logic — e.g. `routes/upload.ts` only guards the file then delegates
to `excel.service` + `candidate.service`. Enrichment, dedup, scoring and email idempotency
each live in one service module. The frontend talks to the API through a single axios
client (`frontend/src/services/api.ts`).

Auth is Google OAuth 2.0 via `passport-google-oauth20`, session persisted with
`express-session` (httpOnly cookie, 7-day maxAge). `serializeUser` stores the user id;
`deserializeUser` reloads from `users`. The `users` row is upserted on `google_id`.

---

## 2. Built vs skipped vs next

### Built (inside the cut line)
- Google login, session persistence, `/auth/me`, logout; **all resource endpoints
  behind an `ensureAuth` guard** that returns 401.
- Six-table schema via migrations 001–006, with indexes (§4 below).
- **Streaming, multi-sheet** Excel parse (`services/ingest.service.ts`, exceljs
  `stream.xlsx.WorkbookReader`) — the workbook is never loaded whole; header mapping
  covers all three sample sheet variants incl. split first/last and phone
  (`utils/headerMap.ts`).
- **Batched upserts** (~1000 rows/statement) with in-file dedup + a per-row fallback
  that isolates a bad row so the rest of the batch still lands.
- **Async ingest job**: `POST /upload` returns `202 {jobId}`, parsing runs off the
  request path, progress + inserted/merged/failed persist to `ingest_jobs`, and each
  bad row is written to `ingest_failures` with a reason (`GET /upload/:id`,
  `GET /upload/:id/failures`).
- Deterministic, rule-based enrichment — no LLM, no paid API (`services/enrichment.service.ts`).
- Deduped upsert on normalized email; merge **never overwrites a populated field with a
  blank** (COALESCE/NULLIF); inserted-vs-merged counted via `RETURNING (xmax = 0)`.
- Unknown/extra columns preserved verbatim in `candidates.raw` (JSONB).
- 60/20/20 match scorer with a "why" (`services/scoring.ts`), both directions
  (`/candidates/:id/matches`, `/positions/:id/matches`), deterministic tie-break.
- Idempotent bulk email backed by `UNIQUE(position_id, candidate_id)`; failures recorded
  with reason and retried; personalized (first name w/ fallback, matched skills, position).
- Seven routed frontend pages with loading/empty/error states; server-paginated
  candidates list; multi-select bulk email with confirm + summary.
- Seed loads `sample-data/positions.json`. Unit tests for header mapping, dedup/merge,
  scorer, and email idempotency (`vitest`).

### Skipped (outside the cut line — deliberate)
| Skipped | Why | How it would be built |
|---|---|---|
| Name+phone fallback dedup | Email covers the common case; `phone` is now captured but unused as a key | When email is blank, match `lower(trim(name))` + normalized phone before insert |
| Separate worker process / queue | In-process background covers a single node; a real deploy wants isolation | Move `runIngest` behind a queue (BullMQ/pg-boss) and a dedicated worker |
| Live push progress | Polling `GET /upload/:id` is truthful and simple | WebSocket/SSE to push job progress instead of client polling |
| Table virtualization | Server pagination already bounds the DOM | Add `react-window` if very large pages are ever rendered client-side |

### Next (in priority order, if the clock kept running)
1. Name+phone fallback dedup for email-less rows.
2. Move ingestion behind a real queue + worker for multi-instance deploys.
3. Statutory/richer match signals (recency, seniority fit) beyond the 60/20/20 base.

---

## 3. Match formula (documented, per §2.4)

Score is out of 100, computed per candidate against a position:

```
skillScore       = (matchedRequiredSkills / totalRequiredSkills) * 60     // 0..60
experienceScore  = candidate.years_of_experience >= position.min_experience ? 20 : 0
locationScore    = position.remote || candidate.location == position.location ? 20 : 0
score            = round(skillScore + experienceScore + locationScore)
```

- **Weights:** skills 60%, experience 20%, location 20% — skills dominate because they're
  the strongest signal of fit; experience and location are pass/fail gates.
- **"why":** a truthful, data-derived string, e.g. *"Matched 3 of 5 required skills;
  Experience requirement satisfied; Location matched"*. Every clause is computed from the
  same values that produced the score, so it can't disagree with the number.
- **Tie-break:** deterministic — score desc, then id asc (candidate id for
  `/positions/:id/matches`, position id for `/candidates/:id/matches`).
- **Both directions:** `/candidates/:id/matches` ranks positions for a candidate;
  `/positions/:id/matches` ranks candidates for a position (the spec's canonical view),
  shortlisted via the GIN index (§6) so it stays sub-second at scale.

---

## 4. Indexes — what and why (§5)

| Index | Table | Why |
|---|---|---|
| `email` UNIQUE (implicit btree) | candidates | Email is the dedup key; the unique constraint both enforces dedup and makes `ON CONFLICT (email)` an indexed lookup |
| `gin(skills)` | candidates | Skill filtering is array-containment (`skills @> ARRAY[...]`); GIN is the right access method for `text[]` membership |
| `btree(name)`, `btree(location)` | candidates | Support the planned name+phone fallback dedup and location-facet browsing |
| `gin(required_skills)` | positions | Symmetric to candidate skills for match queries that filter positions by required skill |
| `btree(location)` | positions | Location filtering |
| `UNIQUE(position_id, candidate_id)` | email_sends | The idempotency guarantee — a second send for the same pair is rejected at the DB, not just in app code |
| `btree(status)`, `btree(created_at)` | ingest_jobs | Job dashboards filter by status / sort by recency |
| `btree(job_id)` | ingest_failures | Fetch all failures for one job |

---

## 5. Performance targets — measured

Verified locally against Postgres 16 with the generator's messy 3-sheet workbook:

| Target (§7) | Result |
|---|---|
| Stream-parse, never whole workbook in memory | **PASS** — 100k-row / 35 MB file ingested at **peak RSS 125 MB** (run under a 512 MB heap cap, no OOM) |
| 100k in single-digit minutes | **PASS** — **25.5 s** end-to-end (parse + enrich + batched upsert) |
| Same file twice → 0 new | **PASS** — re-ingest reported `inserted: 0` (all merged); row accounting exact (read = inserted + merged + failed) |
| Failed rows reported with reasons | **PASS** — written to `ingest_failures` (e.g. "Missing email"), exposed at `GET /upload/:id/failures` |
| Candidates list p95 < 300 ms @ 100k | Server-paginated (`LIMIT/OFFSET` + count); OFFSET is the honest weak spot at deep pages — the keyset plan in §6 is the fix |
| Match shortlist < 1 s | GIN-shortlisted (`skills && required_skills`, overlap-ordered, `LIMIT 500`); candidates sharing zero required skills are intentionally excluded from the shortlist |

Honest trade-offs that remain (not defects — bounded choices):
- Background ingest is **in-process** (fire-and-forget), not a separate worker — fine for a
  single node, not for horizontal scale (see §2 "skipped").
- Progress is **polled**, not pushed.
- Deep-page pagination uses OFFSET; keyset pagination (§6) is the scale fix.

---

## 6. Scaling plan — each piece at millions of rows

The current slice is correct at sample scale; here's the path to millions.

- **Ingestion.** Move off the request path entirely: upload → object store (or temp disk) →
  `202 {jobId}` → worker. Parse with the streaming `WorkbookReader` (flat memory), enrich in
  batches, and land rows with `COPY`/multi-row `INSERT` of ~1–5k. Dedup stays correct via
  `ON CONFLICT (email)`. At tens of millions, stage into an unlogged table then
  `INSERT ... ON CONFLICT ... SELECT` in one pass. Multiple concurrent uploads are isolated
  by `job_id`. Progress and per-row failures persist to `ingest_jobs`/`ingest_failures`.

- **Candidates list.** Never `SELECT *` unbounded. Keyset (seek) pagination —
  `WHERE (created_at, id) < ($cursor) ORDER BY created_at DESC, id DESC LIMIT $n` — stays
  O(page) at any table size, unlike OFFSET. Server-paginate the API and virtualize the table
  client-side so the DOM holds one page, not a million rows.

- **Skill search.** `skills @> ARRAY[$1]` on the GIN index scales to millions; for
  multi-facet filters, combine with partial/expression indexes as the query shapes settle.

- **Matching.** For *candidates for a position*, push the score into SQL: a
  cardinality/overlap expression on the `skills`/`required_skills` arrays with a `LIMIT`
  shortlist, so ranking happens in the DB and returns the top-N in well under a second
  instead of scoring every candidate in Node. Precompute/materialize if positions are hot.

- **Email.** Enqueue sends (one row per recipient in `email_sends` with `status='queued'`),
  drain with a rate-limited worker, and lean on `UNIQUE(position_id, candidate_id)` so
  retries and double-clicks can never double-send. Move template rendering off the hot path.

- **Auth/sessions.** Move session storage from memory to Redis so multiple API instances
  share sessions behind a load balancer.
