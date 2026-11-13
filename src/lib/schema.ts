/**
 * The dashboard's tables. Every statement is safe to run more than once, so the app runs them
 * itself the first time each server instance talks to the database (see `store.ts`). No separate
 * migration step, and no need to copy the connection string out of Vercel.
 */
export const SCHEMA: readonly string[] = [
  `create table if not exists messages (
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
  )`,
  `create index if not exists messages_status_received on messages (status, received_at desc)`,
  // Added 2026-11-13: phone, lead stage and notes. Additive only, so existing rows keep working.
  `alter table messages add column if not exists phone text not null default ''`,
  `alter table messages add column if not exists stage text not null default 'open'
    check (stage in ('open', 'replied', 'won', 'lost'))`,
  `create table if not exists message_notes (
    id uuid primary key default gen_random_uuid(),
    message_id uuid not null references messages (id) on delete cascade,
    body text not null,
    created_at timestamptz not null default now()
  )`,
  `create index if not exists message_notes_message on message_notes (message_id, created_at)`,
  `create table if not exists push_subscriptions (
    endpoint text primary key,
    p256dh text not null,
    auth text not null,
    user_agent text not null default '',
    created_at timestamptz not null default now()
  )`,
];
