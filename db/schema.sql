-- The dashboard's tables. Safe to run more than once: `pnpm db:migrate`.

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  received_at timestamptz not null default now(),
  status text not null default 'new' check (status in ('new', 'read', 'archived')),
  topic text not null check (topic in ('project', 'job', 'other')),
  name text not null default '',
  email text not null,
  website text not null default '',
  project_kind text not null default '',
  budget text not null default '',
  timeline text not null default '',
  company text not null default '',
  role text not null default '',
  message text not null
);

create index if not exists messages_status_received on messages (status, received_at desc);

create table if not exists push_subscriptions (
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  user_agent text not null default '',
  created_at timestamptz not null default now()
);
