

create table if not exists positions (
    id text primary key,

    title text not null,

    required_skills text[] not null default '{}',

    min_experience integer not null default 0,

    location text,

    remote boolean not null default false,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

-- Indexes

create index if not exists idx_positions_location
on positions(location);

create index if not exists idx_positions_required_skills
on positions using gin(required_skills);