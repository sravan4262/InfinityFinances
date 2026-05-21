-- Global feature flag toggle.
-- Edit the two variables below, then run this file with psql:
--
--   psql "$DATABASE_URL" -f supabase/scripts/seed-feature-flag-global.sql
--
-- Or via the Supabase SQL editor: paste from the `insert into app.feature_flags`
-- line onward and replace the :'flag' / :enabled tokens by hand.

\set flag    'chat'
\set enabled true

insert into app.feature_flags (key, global_enabled, description)
values (:'flag', :enabled, 'Seeded by seed-feature-flag-global.sql')
on conflict (key)
do update set global_enabled = excluded.global_enabled, updated_at = now();
