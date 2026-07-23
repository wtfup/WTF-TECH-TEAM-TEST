

create table if not exists ingest_failures (
    id bigserial primary key,

    job_id bigint not null references ingest_jobs(id) on delete cascade,

    row_number integer not null,

    raw jsonb not null,

    reason text not null,

    created_at timestamptz not null default now()
);

-- Indexes

create index if not exists idx_ingest_failures_job_id
on ingest_failures(job_id);