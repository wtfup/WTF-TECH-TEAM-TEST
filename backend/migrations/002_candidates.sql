create table if not exists candidates (
    id bigserial primary key,

    email text unique,
    name text not null,
    phone text,

    skills text[] default '{}',
    years_of_experience integer,
    seniority text,

    location text,

    raw jsonb,

    source_file text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes

create index if not exists idx_candidates_name
on candidates(name);

create index if not exists idx_candidates_location
on candidates(location);

create index if not exists idx_candidates_skills
on candidates using gin(skills);