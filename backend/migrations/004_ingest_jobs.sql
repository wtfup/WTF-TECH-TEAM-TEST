-- Ingest Jobs
-- Tracks every Excel upload job and its progress.

create table if not exists ingest_jobs (
    id bigserial primary key,

    filename text not null,

    status text not null default 'pending',

    total_rows integer not null default 0,
    processed_rows integer not null default 0,

    inserted integer not null default 0,
    merged integer not null default 0,
    failed integer not null default 0,

    error text,

    created_at timestamptz not null default now(),
    finished_at timestamptz
);

-- Indexes

create index if not exists idx_ingest_jobs_status
on ingest_jobs(status);

create index if not exists idx_ingest_jobs_created_at
on ingest_jobs(created_at);