import express from "express";
import cors from "cors";
import { env } from "./env";
import { ping } from "./db";
import passport from "./auth/passport";
import { sessionMiddleware } from "./auth/session";
import authRouter from "./routes/auth";
import ingestRouter from "./routes/ingest";
const app = express();
app.use(cors({ origin: env.frontendUrl, credentials: true }));
app.use(express.json());
app.use(sessionMiddleware);

app.use(passport.initialize());
app.use(passport.session());

app.get("/health", async (_req, res) => {
  try {
    const db = await ping();
    res.json({ ok: true, db });
  } catch (err) {
    res.status(500).json({ ok: false, db: false, error: String(err) });
  }
});

// README §2.1 — Google OAuth routes (login, callback, logout, /me)
app.use("/auth", authRouter);

// README §2.2 — bulk Excel ingestion (streaming, batched, deduped, non-blocking).
app.use("/ingest", ingestRouter);
// README §2.3 — enrichment.  §2.4 — matching.  §2.5 — bulk email (idempotent).

app.use((_req, res) => res.status(404).json({ error: "not found" }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: "internal server error" });
});

app.listen(env.port, () => {
  console.log(`TalentMatch backend on http://localhost:${env.port}`);
  console.log(`  health: http://localhost:${env.port}/health`);
});