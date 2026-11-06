create table shifts (
  id             bigserial primary key,
  slug           text not null unique,
  label          text not null check (label in ('scheduled','off-schedule','rehearsal')),
  status         text not null check (status in ('open','closed','shipped','failed','dark')),
  closes_at      timestamptz not null,
  started_at     timestamptz,
  finished_at    timestamptz,
  reason         text,
  snapshot_block bigint,
  tally          jsonb,
  build_model    text,
  cost_cents     integer not null default 0,
  failure_stage  text,
  failure_reason text,
  created_at     timestamptz not null default now()
);

create unique index one_open_shift on shifts (status) where status = 'open';

create table proposals (
  id              bigserial primary key,
  text            text not null check (char_length(text) between 1 and 200),
  normalised      text not null,
  author          text not null,
  signature       text,
  signed_at       timestamptz,
  seeded          boolean not null default false,
  status          text not null default 'open' check (status in ('open','built','rejected','vetoed')),
  status_reason   text,
  status_category text,
  failed_attempts integer not null default 0,
  shift_opened    bigint not null references shifts(id),
  built_in        bigint references shifts(id),
  created_at      timestamptz not null default now()
);

create unique index one_proposal_per_wallet_per_shift on proposals (author, shift_opened) where seeded = false;

create unique index one_open_copy_of_a_proposal on proposals (normalised) where status = 'open';

create table votes (
  shift_id        bigint not null references shifts(id),
  voter           text not null,
  proposal_id     bigint not null references proposals(id),
  signature       text not null,
  signed_at       timestamptz not null,
  weight_estimate numeric,
  created_at      timestamptz not null default now(),
  primary key (shift_id, voter)
);

create table floors (
  shift_id          bigint primary key references shifts(id),
  name              text not null,
  one_liner         text not null,
  how_to_use        text not null,
  html              text not null,
  hash              text not null unique,
  script_hashes     text not null,
  status            text not null default 'lit' check (status in ('lit','vetoed')),
  dark_reason       text,
  screenshot_wide   text,
  screenshot_narrow text
);

create table receipts (
  shift_id           bigint primary key references shifts(id),
  bundle             text not null,
  receipt_hash       text not null,
  attestation_uid    text,
  attestation_tx     text,
  attestation_status text not null default 'pending' check (attestation_status in ('pending','attested'))
);

create table receipt_parts (
  shift_id bigint not null references shifts(id),
  part     text not null,
  content  text not null,
  primary key (shift_id, part)
);

create table vetoes (
  id          bigserial primary key,
  target_type text not null check (target_type in ('proposal','floor')),
  target_id   bigint not null,
  reason      text not null check (char_length(reason) between 1 and 300),
  signature   text not null,
  signed_at   timestamptz not null,
  created_at  timestamptz not null default now()
);

create table waitlist (
  id         bigserial primary key,
  community  text not null check (char_length(community) between 1 and 80),
  contact    text not null check (char_length(contact) between 1 and 120),
  created_at timestamptz not null default now(),
  unique (community, contact)
);

create table rate_events (
  key text not null,
  at  timestamptz not null default now()
);

create index rate_events_key_at on rate_events (key, at);
