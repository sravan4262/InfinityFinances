-- Retirement Calc: saved FIRE plans plus the monthly tracker dataset.

-- ── Saved plans ─────────────────────────────────────────────────────────────
create table if not exists retirement.plans (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  inputs      jsonb not null,
  is_public   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, name)
);

create index if not exists retirement_plans_user_id_idx on retirement.plans(user_id);

alter table retirement.plans enable row level security;

create policy "owner_all" on retirement.plans
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Public-share reads (when is_public = true) bypass the owner check.
create policy "public_read" on retirement.plans
  for select
  using (is_public = true);

create trigger retirement_plans_updated_at
  before update on retirement.plans
  for each row execute function public.set_updated_at();

-- ── Tracker categories ──────────────────────────────────────────────────────
create table if not exists retirement.tracker_categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  color       text not null,
  sort_order  integer not null default 0
);

create index if not exists retirement_tracker_categories_user_id_idx
  on retirement.tracker_categories(user_id);

alter table retirement.tracker_categories enable row level security;

create policy "owner_all" on retirement.tracker_categories
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── Tracker entries ─────────────────────────────────────────────────────────
create table if not exists retirement.tracker_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  month        varchar(7) not null,
  category_id  uuid not null references retirement.tracker_categories(id) on delete cascade,
  planned      numeric,
  actual       numeric,
  unique (user_id, month, category_id)
);

create index if not exists retirement_tracker_entries_user_month_idx
  on retirement.tracker_entries(user_id, month);

alter table retirement.tracker_entries enable row level security;

create policy "owner_all" on retirement.tracker_entries
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
