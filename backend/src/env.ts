import dotenv from "dotenv";
import path from "path";

// Load repo-root .env if present (compose also injects these directly).
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config(); // fall back to backend/.env

function required(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) {
    throw new Error(`Missing required env var: ${name} (see .env.example)`);
  }
  return v;
}

export const env = {
  port: parseInt(process.env.PORT ?? "8080", 10),
  databaseUrl: required(
    "DATABASE_URL",
    // Matches docker-compose's published host port (5433:5432) for local runs.
    "postgres://talentmatch:talentmatch@localhost:5433/talentmatch"
  ),
  frontendUrl: process.env.FRONTEND_URL ?? "http://localhost:5173",

  // Google OAuth 2.0 (README §2.1). Set these in .env — see the README setup steps.
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? "",
  googleClientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
  googleCallbackUrl:
    process.env.GOOGLE_CALLBACK_URL ??
    "http://localhost:8080/auth/google/callback",
  sessionSecret: process.env.SESSION_SECRET ?? "dev-secret-change-me",

  // Dev SMTP (Mailhog) for the bulk-email feature (README §2.5).
  smtpHost: process.env.SMTP_HOST ?? "localhost",
  smtpPort: parseInt(process.env.SMTP_PORT ?? "1025", 10),
};
