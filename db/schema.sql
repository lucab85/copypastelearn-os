-- CopyPasteLearn Core — PostgreSQL schema.
-- Clerk identifies, Medusa sells, CPL owns learning state and access decisions.

create table if not exists cpl_users (
  identity_id text primary key,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists skills (
  id text primary key,
  label text not null,
  domain text not null,
  target numeric not null default 0.8,
  prerequisites text[] not null default '{}'
);

create table if not exists missions (
  id text primary key,
  title text not null,
  domain text not null,
  required_entitlement text not null,
  definition jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists user_skills (
  identity_id text not null references cpl_users(identity_id) on delete cascade,
  skill_id text not null,
  mastery numeric not null default 0,
  confidence numeric not null default 0,
  evidence_count integer not null default 0,
  last_proven_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (identity_id, skill_id)
);

create table if not exists skill_evidence (
  id text primary key,
  identity_id text not null references cpl_users(identity_id) on delete cascade,
  mission_id text not null,
  skill_ids text[] not null,
  evidence_type text not null,
  label text not null,
  score numeric not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);
create index if not exists skill_evidence_identity_created_idx on skill_evidence(identity_id, created_at desc);

create table if not exists mission_runs (
  identity_id text not null references cpl_users(identity_id) on delete cascade,
  mission_id text not null,
  state jsonb not null,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (identity_id, mission_id)
);

create table if not exists user_progress (
  identity_id text primary key references cpl_users(identity_id) on delete cascade,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists entitlements (
  identity_id text not null references cpl_users(identity_id) on delete cascade,
  entitlement_key text not null,
  source text not null,
  external_id text,
  granted_at timestamptz not null default now(),
  primary key (identity_id, entitlement_key)
);

create table if not exists commerce_events (
  event_id text primary key,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz not null default now()
);

create table if not exists lab_sessions (
  identity_id text not null references cpl_users(identity_id) on delete cascade,
  mission_id text not null,
  sandbox_name text not null unique,
  provider text not null,
  status text not null default 'ready',
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  primary key (identity_id, mission_id)
);

create table if not exists lab_events (
  id text primary key,
  identity_id text not null references cpl_users(identity_id) on delete cascade,
  mission_id text not null,
  sandbox_name text not null,
  event_type text not null,
  command_redacted text,
  stdout_redacted text,
  stderr_redacted text,
  exit_code integer,
  created_at timestamptz not null default now()
);
create index if not exists lab_events_identity_mission_created_idx on lab_events(identity_id, mission_id, created_at desc);
