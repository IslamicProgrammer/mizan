create table if not exists users (
  id            uuid primary key default gen_random_uuid(),
  google_sub    text unique not null,
  email         text,
  created_at    timestamptz not null default now()
);

create table if not exists profiles (
  user_id    uuid primary key references users(id) on delete cascade,
  state      jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
