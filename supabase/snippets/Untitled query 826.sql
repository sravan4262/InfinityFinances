-- Cross-cutting feature flags. Drives the long-poll endpoint that gates
-- UI surfaces (e.g. the chat FAB) without a redeploy.
--
-- Flags are managed by hand in the SQL editor. When updating a row, also
-- set `updated_at = now()` so the long-poll watcher sees the change.

create schema if not exists app;

-- ── Global defaults (one row per flag key) ─────────────────────────────────
create table if not exists app.feature_flags (
  key            text primary key,
  global_enabled boolean not null default false,
  description    text,
  updated_at     timestamptz not null default now()
);

-- ── Per-user overrides ─────────────────────────────────────────────────────
-- Presence of a row = explicit decision for that user. Absence = fall back
-- to global_enabled. Overrides may be true (beta opt-in while global is off)
-- or false (kill-switch for a single user while global is on).
create table if not exists app.feature_flag_users (
  user_id    uuid not null references auth.users(id) on delete cascade,
  key        text not null references app.feature_flags(key) on delete cascade,
  enabled    boolean not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, key)
);

create index if not exists feature_flag_users_user_idx on app.feature_flag_users(user_id);

-- ── RLS ────────────────────────────────────────────────────────────────────
alter table app.feature_flags      enable row level security;
alter table app.feature_flag_users enable row level security;

drop policy if exists "auth_read" on app.feature_flags;
create policy "auth_read" on app.feature_flags
  for select to authenticated using (true);

drop policy if exists "owner_read" on app.feature_flag_users;
create policy "owner_read" on app.feature_flag_users
  for select to authenticated using (auth.uid() = user_id);

-- Writes (both tables) are intentionally service-role / SQL-editor only.
-- No insert/update/delete policies on purpose.

-- ── Seed ───────────────────────────────────────────────────────────────────
insert into app.feature_flags (key, global_enabled, description) values
  ('chat', false, 'Master toggle for the AI chat assistant')
on conflict (key) do nothing;


select * from app.feature_flag_users

select * from chat.messages