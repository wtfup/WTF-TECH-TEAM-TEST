# Starter scaffold

A **minimal, runnable** skeleton so you don't burn your ~2–3 hours on
boilerplate. It boots the whole stack with **one command** and proves it's
wired. **None of the actual features are implemented** — that's the test. Every
stub is marked `TODO (candidate)` and points at the relevant [`README.md`](./README.md)
section.

> You are free to **change anything** — swap Express for Fastify/Nest, Vite for
> Next, add an ORM or a queue, restructure folders. The scaffold is a courtesy,
> not a constraint. Just **justify meaningful changes in `ARCHITECTURE.md`**.

## Run it

```bash
cp .env.example .env        # (Google creds can stay blank until you build auth)
docker compose up           # first run builds images; give it a minute
```

Then:

| URL | What |
|-----|------|
| http://localhost:5173 | Frontend shell — shows live stack status |
| http://localhost:8080/health | Backend health (checks Postgres) |
| http://localhost:8025 | Mailhog — where your dev emails land (README §2.5) |
| localhost:5432 | Postgres (`talentmatch` / `talentmatch` / db `talentmatch`) |

If the frontend shows **backend reachable + Postgres connected**, you're good.

### Run migrations / seed

```bash
docker compose exec backend npm run migrate   # applies backend/migrations/*.sql
docker compose exec backend npm run seed      # loads sample-data/positions.json (stub)
```

### Prefer running locally (no Docker)?

Start Postgres + Mailhog however you like, then:

```bash
cd backend  && npm install && npm run migrate && npm run dev   # :8080
cd frontend && npm install && npm run dev                      # :5173
```

## What's wired vs. what's yours

| Given (scaffold) | Yours to build (graded) |
|------------------|--------------------------|
| `docker compose` stack: Postgres, Mailhog, backend, frontend | Google OAuth 2.0 + protected routes (§2.1) |
| Backend: Express + TS, `/health`, CORS, JSON, error handler | Streaming Excel ingestion at 100k+ scale, dedup, progress (§2.2) |
| Postgres pool + **forward-only migration runner** | Enrichment (§2.3) |
| One starter migration: `users` | Matching engine + scores + "why" (§2.4) |
| Seed **stub** that loads `positions.json` | Bulk idempotent email via Mailhog (§2.5) |
| Frontend: React + Vite shell, health check, disabled Google button | **The entire real UI** (§3): routes, paginated candidates table, upload progress, etc. |
| `.env.example`, `.gitignore` | The rest of the schema + indexes (§5) |

## File map

```
.
├── README.md                 ← the full spec (read this first)
├── STARTER.md                ← you are here
├── docker-compose.yml        ← one-command stack
├── .env.example
├── sample-data/              ← positions.json + messy-data generator
├── backend/                  ← Node + TypeScript + Express
│   ├── src/{index,env,db,migrate,seed}.ts
│   └── migrations/001_users.sql
└── frontend/                 ← React + Vite + TypeScript shell
    └── src/{main,App}.tsx
```

Now go read [`README.md`](./README.md), write your `PLAN.md`, and start with the
part that matters most: **ingestion at scale (§2.2).**
