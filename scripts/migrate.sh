#!/usr/bin/env bash
# Run every SQL migration in supabase/migrations/ in order, against $DATABASE_URL.
# Defaults to the local Supabase Docker postgres (port 54322).
#
# Usage:
#   ./scripts/migrate.sh                          # local Supabase Docker
#   DATABASE_URL=postgres://… ./scripts/migrate.sh   # any other postgres
#   ./scripts/migrate.sh --reset                  # drop all four schemas first, then re-apply

set -euo pipefail

DEFAULT_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"
DATABASE_URL="${DATABASE_URL:-$DEFAULT_URL}"

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
MIGRATIONS_DIR="$REPO_ROOT/supabase/migrations"

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; CYAN='\033[0;36m'; RESET='\033[0m'

if ! command -v psql >/dev/null 2>&1; then
  echo -e "${RED}psql not found. Install Postgres CLI (e.g. \`brew install libpq && brew link --force libpq\`).${RESET}"
  exit 1
fi

echo -e "${CYAN}→ DATABASE_URL: ${DATABASE_URL/:*@/:****@}${RESET}"

# Quick connectivity check
if ! psql "$DATABASE_URL" -c 'select 1' >/dev/null 2>&1; then
  echo -e "${RED}Can't connect.${RESET} Is your local Supabase running?  → ${CYAN}supabase start${RESET}"
  exit 1
fi

# Optional reset
if [[ "${1:-}" == "--reset" ]]; then
  echo -e "${YELLOW}→ Dropping schemas: retirement, home, budget, chat${RESET}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -c "
    drop schema if exists retirement cascade;
    drop schema if exists home cascade;
    drop schema if exists budget cascade;
    drop schema if exists chat cascade;
  " >/dev/null
fi

# Apply migrations in alphabetical order
shopt -s nullglob
files=("$MIGRATIONS_DIR"/*.sql)
if [[ ${#files[@]} -eq 0 ]]; then
  echo -e "${RED}No .sql files found in $MIGRATIONS_DIR${RESET}"
  exit 1
fi

for f in "${files[@]}"; do
  name="$(basename "$f")"
  echo -e "${CYAN}→ $name${RESET}"
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"
done

echo -e "${GREEN}✓ All migrations applied${RESET}"

# Sanity check — list every table we just created
psql "$DATABASE_URL" -At -c "
  select schemaname || '.' || tablename
  from pg_tables
  where schemaname in ('retirement','home','budget','chat')
  order by 1
" | sed "s/^/  /"
