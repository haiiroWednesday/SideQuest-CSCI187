#!/usr/bin/env bash
# Runs every SideQuest SQL test against a throwaway PostgreSQL 16 and fails on the first error.
# Connection comes from the usual PG* variables (PGHOST, PGPORT, PGUSER, PGPASSWORD); the user
# must be a superuser on a scratch server. Never point this at a real Supabase project.
#
# 1. Template "live": fake auth, EVERY file in supabase/migrations in order, then the accounts SQL
#    that is live in Supabase (proposals/20261124000000_accounts_personal_tables_REVIEW_ONLY.sql).
# 2. Each supabase/tests/*.sql runs in its own copy of that template.
# 3. Each supabase/proposals/tests/*.sql runs in its own copy with the proposals it needs applied.
#    A proposal test with no entry in PROPOSAL_TESTS fails the run, so nothing is silently skipped.
#
# For mutation checks, ACCOUNTS_SQL or OPEN_INVITES_SQL may point at a modified copy.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(cd "$here/.." && pwd)"
ACCOUNTS_SQL="${ACCOUNTS_SQL:-$root/proposals/20261124000000_accounts_personal_tables_REVIEW_ONLY.sql}"
OPEN_INVITES_SQL="${OPEN_INVITES_SQL:-$root/proposals/20261125030000_open_invites_REVIEW_ONLY.sql}"
prefix="${SQ_DB_PREFIX:-sq_sqltest}"
tpl="${prefix}_live"
psql_admin=(psql -X -q -v ON_ERROR_STOP=1 -d "${PGDATABASE:-postgres}")

# Test-only files in supabase/tests that are not part of the run:
#   accounts_personal_tables_live_check.sql is for the hosted SQL editor and always ends by raising.
SKIP_TESTS=" accounts_personal_tables_live_check.sql "

# proposal test -> proposals it needs, in order (applied on top of the live template)
declare -A PROPOSAL_TESTS=(
  [group_plan_storage_review.sql]="$root/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql"
  [group_plan_rpc_review.sql]="$root/proposals/20261120000000_group_plan_storage_REVIEW_ONLY.sql $root/proposals/20261120010000_group_plan_rpcs_REVIEW_ONLY.sql"
  [open_invites_review.sql]="$OPEN_INVITES_SQL"
  [event_access_contact_review.sql]="$root/proposals/20261125010000_event_access_contact_REVIEW_ONLY.sql"
)
# proposals with no behaviour test yet: applied once so a syntax or dependency error still fails
APPLY_ONLY=("$root/proposals/20261125000000_google_connections_REVIEW_ONLY.sql")

drop_db() { "${psql_admin[@]}" -c "drop database if exists \"$1\"" >/dev/null 2>&1; }
copy_db() { drop_db "$1"; "${psql_admin[@]}" -c "create database \"$1\" template \"$tpl\"" >/dev/null; }
run() { psql -X -q -v ON_ERROR_STOP=1 -d "$1" -f "$2" >/dev/null; }
created=()
cleanup() { for d in "${created[@]}" "$tpl"; do drop_db "$d"; done; }
trap cleanup EXIT

# A test that turns ON_ERROR_STOP off would print errors and still pass.
if grep -lE '^[[:space:]]*\\set[[:space:]]+ON_ERROR_STOP[[:space:]]+(0|off|false)' "$here"/*.sql "$root"/proposals/tests/*.sql; then
  echo "FAIL: the files above turn ON_ERROR_STOP off" >&2; exit 1
fi

echo "== live template: every migration + live accounts SQL"
drop_db "$tpl"
"${psql_admin[@]}" -c "create database \"$tpl\"" >/dev/null
run "$tpl" "$here/fixture/auth_stub.sql"
shopt -s nullglob
for f in "$root"/migrations/*.sql; do echo "   apply migrations/$(basename "$f")"; run "$tpl" "$f"; done
echo "   apply $(basename "$ACCOUNTS_SQL")"; run "$tpl" "$ACCOUNTS_SQL"

n=0
for t in "$here"/*.sql; do
  name="$(basename "$t")"
  [[ "$SKIP_TESTS" == *" $name "* ]] && { echo "-- skip tests/$name (hosted editor only)"; continue; }
  db="${prefix}_t$((n++))"; created+=("$db"); copy_db "$db"
  echo "== tests/$name"; run "$db" "$t"; drop_db "$db"
done

for t in "$root"/proposals/tests/*.sql; do
  name="$(basename "$t")"
  if [[ -z "${PROPOSAL_TESTS[$name]+set}" ]]; then
    echo "FAIL: proposals/tests/$name has no entry in PROPOSAL_TESTS in $0" >&2; exit 1
  fi
  db="${prefix}_t$((n++))"; created+=("$db"); copy_db "$db"
  for p in ${PROPOSAL_TESTS[$name]}; do echo "   apply $(basename "$p")"; run "$db" "$p"; done
  echo "== proposals/tests/$name"; run "$db" "$t"; drop_db "$db"
done

for p in "${APPLY_ONLY[@]}"; do
  db="${prefix}_t$((n++))"; created+=("$db"); copy_db "$db"
  echo "== apply only (no behaviour test yet): $(basename "$p")"; run "$db" "$p"; drop_db "$db"
done
echo "All SQL tests passed."
