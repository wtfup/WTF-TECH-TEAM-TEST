import express from "express";
import cors from "cors";
import { env } from "./env";
import { ping } from "./db";

const app = express();
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());

/**
 * Health check — used by docker-compose and the frontend shell to prove the
 * stack is wired (Postgres reachable). This is the ONLY thing that works
 * out of the box. Everything else below is yours to build.
 */
app.get("/health", async (_req, res) => {
  try {
    const db = await ping();
    res.json({ ok: true, db });
  } catch (err) {
    res.status(500).json({ ok: false, db: false, error: String(err) });
  }
});

// ---------------------------------------------------------------------------
// TODO (candidate): everything below is a stub. Build per the root README.
// ---------------------------------------------------------------------------

// README §2.1 — Google OAuth 2.0. Replace these stubs with a real flow.
app.get("/me", (_req, res) => {
  res.status(401).json({ error: "not authenticated — implement Google OAuth (README §2.1)" });
});
app.get("/auth/google", (_req, res) => {
  res.status(501).json({ error: "TODO: begin Google OAuth (README §2.1)" });
});
app.get("/auth/google/callback", (_req, res) => {
  res.status(501).json({ error: "TODO: complete Google OAuth + set session (README §2.1)" });
});
app.post("/auth/logout", (_req, res) => {
  res.status(501).json({ error: "TODO: clear session (README §2.1)" });
});

// README §2.2 — bulk Excel ingestion (streaming, batched, deduped, non-blocking).
// README §2.3 — enrichment.  §2.4 — matching.  §2.5 — bulk email (idempotent).
// Suggested API surface is documented in the root README §4.

// 404
app.use((_req, res) => res.status(404).json({ error: "not found" }));

// Central error handler — server must never die on one bad request/row.
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: "internal server error" });
});

app.listen(env.port, () => {
  console.log(`TalentMatch backend on http://localhost:${env.port}`);
  console.log(`  health: http://localhost:${env.port}/health`);
});
