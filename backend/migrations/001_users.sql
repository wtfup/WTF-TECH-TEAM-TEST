-- Starter migration: users (populated by the Google OAuth flow, README §2.1).
-- The rest of the schema is yours to design (README §5):
--   candidates, positions, ingest_jobs, ingest_failures, email_sends + indexes.

create table if not exists users (
  id          bigserial primary key,
  google_id   text unique not null,
  email       text unique not null,
  name        text,
  avatar_url  text,
  created_at  timestamptz not null default now()
);
