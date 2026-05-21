-- Chat: one conversation per (user, area), with messages under each session.

-- ── Sessions ────────────────────────────────────────────────────────────────
create table if not exists chat.sessions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  area        text not null check (area in ('retirement','home','budget')),
  created_at  timestamptz not null default now(),
  unique (user_id, area)
);

create index if not exists chat_sessions_user_idx on chat.sessions(user_id);

alter table chat.sessions enable row level security;

create policy "owner_all" on chat.sessions
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Messages ────────────────────────────────────────────────────────────────
create table if not exists chat.messages (
  id                uuid primary key default gen_random_uuid(),
  session_id        uuid not null references chat.sessions(id) on delete cascade,
  role              text not null check (role in ('user', 'assistant')),
  content           text not null,
  extracted_inputs  jsonb,
  created_at        timestamptz not null default now()
);

create index if not exists chat_messages_session_id_idx on chat.messages(session_id);

alter table chat.messages enable row level security;

create policy "owner_via_session" on chat.messages
  for all
  using (
    exists (
      select 1 from chat.sessions s
      where s.id = messages.session_id and s.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from chat.sessions s
      where s.id = messages.session_id and s.user_id = auth.uid()
    )
  );
