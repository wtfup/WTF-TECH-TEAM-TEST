

create table if not exists email_sends (
    id bigserial primary key,

    position_id text not null
        references positions(id)
        on delete cascade,

    candidate_id bigint not null
        references candidates(id)
        on delete cascade,

    status text not null default 'queued',

    error text,

    sent_at timestamptz,

    created_at timestamptz not null default now(),

    unique(position_id, candidate_id)
);


create index if not exists idx_email_sends_status
on email_sends(status);

create index if not exists idx_email_sends_position
on email_sends(position_id);

create index if not exists idx_email_sends_candidate
on email_sends(candidate_id);