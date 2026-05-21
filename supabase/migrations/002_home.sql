-- Home Calc: saved home calculator inputs per user
-- (break-even / mortgage / affordability).
create table if not exists home.profiles (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null default 'My Home Profile',
  break_even    jsonb,
  mortgage      jsonb,
  affordability jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique(user_id, name)
);

create index if not exists home_profiles_user_id_idx on home.profiles(user_id);

alter table home.profiles enable row level security;

create policy "owner_all" on home.profiles
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create trigger home_profiles_updated_at
  before update on home.profiles
  for each row execute function public.set_updated_at();
