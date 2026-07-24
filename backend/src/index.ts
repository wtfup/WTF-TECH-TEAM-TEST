import express from "express";
import cors from "cors";
import { env } from "./env";
import { ping } from "./db";
import passport from "./auth/passport";
import { sessionMiddleware } from "./auth/session";
import authRouter from "./routes/auth";
import uploadRoutes from "./routes/upload";
import positionRoutes from "./routes/positions";
import candidateRoutes from "./routes/candidates";
import emailRoutes from "./routes/email";
import { ensureAuth } from "./middlewares/auth";
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

// Resource endpoints require an authenticated session (README §2.1).
// README §2.2 — bulk Excel ingestion (deduped, non-blocking job).
app.use("/upload", ensureAuth, uploadRoutes);
// README §2.3 — enrichment.  §2.4 — matching.  §2.5 — bulk email (idempotent).
app.use("/candidates", ensureAuth, candidateRoutes);
app.use("/positions", ensureAuth, positionRoutes);
app.use("/emails", ensureAuth, emailRoutes);
app.use((_req, res) => res.status(404).json({ error: "not found" }));

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[error]", err);
  res.status(500).json({ error: "internal server error" });
});

app.listen(env.port, () => {
  console.log(`TalentMatch backend on http://localhost:${env.port}`);
  console.log(`  health: http://localhost:${env.port}/health`);
});