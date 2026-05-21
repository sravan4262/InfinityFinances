-- Budget Calc: single per-user dataset across accounts, categories, transactions,
-- recurrence rules, and monthly budgets.

-- ── Accounts ────────────────────────────────────────────────────────────────
create table if not exists budget.accounts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  type        text not null check (type in ('cash','card','bank')),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists budget_accounts_user_idx on budget.accounts(user_id);

-- ── Categories ──────────────────────────────────────────────────────────────
create table if not exists budget.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  label       text not null,
  color       text not null,
  kind        text not null check (kind in ('income','expense')),
  sort_order  integer not null default 0
);
create index if not exists budget_categories_user_idx on budget.categories(user_id);

-- ── Recurrence rules (declared before transactions so the FK resolves) ─────
create table if not exists budget.recurrence_rules (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id) on delete cascade,
  kind                        text not null check (kind in ('income','expense')),
  amount                      numeric(14,2) not null,
  category_id                 uuid not null references budget.categories(id) on delete restrict,
  account_id                  uuid not null references budget.accounts(id) on delete restrict,
  note                        text,
  description                 text,
  start_date                  date not null,
  end_date                    date,
  frequency                   text not null check (frequency in ('daily','weekly','monthly','yearly')),
  interval                    integer not null default 1,
  last_materialized_through   date
);
create index if not exists budget_recurrence_rules_user_idx on budget.recurrence_rules(user_id);

-- ── Transactions ────────────────────────────────────────────────────────────
create table if not exists budget.transactions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  date            date not null,
  kind            text not null check (kind in ('income','expense')),
  amount          numeric(14,2) not null,
  category_id     uuid not null references budget.categories(id) on delete restrict,
  account_id      uuid not null references budget.accounts(id) on delete restrict,
  note            text,
  description     text,
  recurrence_id   uuid references budget.recurrence_rules(id) on delete set null,
  created_at      timestamptz not null default now()
);
create index if not exists budget_transactions_user_date_idx
  on budget.transactions(user_id, date desc);

-- ── Monthly category budgets ────────────────────────────────────────────────
create table if not exists budget.monthly_budgets (
  user_id      uuid not null references auth.users(id) on delete cascade,
  month        varchar(7) not null,                                       -- 'YYYY-MM'
  category_id  uuid not null references budget.categories(id) on delete cascade,
  amount       numeric(14,2) not null,
  primary key (user_id, month, category_id)
);

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table budget.accounts          enable row level security;
alter table budget.categories        enable row level security;
alter table budget.recurrence_rules  enable row level security;
alter table budget.transactions      enable row level security;
alter table budget.monthly_budgets   enable row level security;

create policy "owner_all" on budget.accounts          for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on budget.categories        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on budget.recurrence_rules  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on budget.transactions      for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "owner_all" on budget.monthly_budgets   for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
