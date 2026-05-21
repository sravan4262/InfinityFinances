-- Per-user feature flag override.
-- Edit the three variables below, then run this file with psql:
--
--   psql "$DATABASE_URL" -f supabase/scripts/seed-feature-flag-user.sql
--
-- Or via the Supabase SQL editor: paste from the `insert into app.feature_flags`
-- line onward and replace the :'email' / :'flag' / :enabled tokens by hand.
--
-- Safe to run repeatedly. If no auth.users row exists for the email yet
-- (e.g. the user has never signed in), the override insert is a no-op
-- rather than an error — the SELECT just returns zero rows.

\set email   'sravan4262@gmail.com'
\set flag    'chat'
\set enabled true

-- 1. Make sure the flag row exists. The migration seeds `chat` already, but
--    if you change :'flag' to something else this keeps the script
--    self-contained.
insert into app.feature_flags (key, description)
values (:'flag', 'Seeded by seed-feature-flag-user.sql')
on conflict (key) do nothing;

-- 2. Upsert the per-user override. The SELECT-driven INSERT means a missing
--    user simply produces zero rows — no error.
insert into app.feature_flag_users (user_id, key, enabled)
select u.id, :'flag', :enabled
  from auth.users u
 where u.email = :'email'
on conflict (user_id, key)
do update set enabled = excluded.enabled, updated_at = now();
