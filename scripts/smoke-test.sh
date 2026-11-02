#!/usr/bin/env bash
# End-to-end smoke test against a running stack (docker compose up -d first).
# Usage: ./scripts/smoke-test.sh [base_url]
set -euo pipefail

BASE_URL="${1:-http://localhost:${FRONTEND_PORT:-8080}}"
pass=0
fail=0

check() {
  local name="$1" expected="$2" actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    printf '  PASS  %s\n' "$name"
    pass=$((pass + 1))
  else
    printf '  FAIL  %s (expected %s, got %s)\n' "$name" "$expected" "$actual"
    fail=$((fail + 1))
  fi
}

status_of() {
  curl -s -o /dev/null -w '%{http_code}' "$@"
}

echo "Smoke testing ${BASE_URL}"

check "frontend serves index.html" 200 "$(status_of "${BASE_URL}/")"
check "nginx health endpoint"       200 "$(status_of "${BASE_URL}/nginx-health")"
check "API + DB readiness via proxy" 200 "$(status_of "${BASE_URL}/api/health")"
check "list tasks"                  200 "$(status_of "${BASE_URL}/api/tasks")"

created="$(curl -s -X POST -H 'content-type: application/json' \
  -d '{"title":"smoke test task"}' "${BASE_URL}/api/tasks")"
task_id="$(printf '%s' "$created" | sed -n 's/.*"id":\([0-9]*\).*/\1/p')"
check "create task returns an id" yes "$([[ -n "$task_id" ]] && echo yes || echo no)"

if [[ -n "$task_id" ]]; then
  check "complete task" 200 "$(status_of -X PATCH -H 'content-type: application/json' \
    -d '{"done":true}' "${BASE_URL}/api/tasks/${task_id}")"
  check "delete task"   204 "$(status_of -X DELETE "${BASE_URL}/api/tasks/${task_id}")"
fi

check "invalid input is rejected" 400 "$(status_of -X POST -H 'content-type: application/json' \
  -d '{"title":""}' "${BASE_URL}/api/tasks")"

echo "Result: ${pass} passed, ${fail} failed"
[[ "$fail" -eq 0 ]]
