#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_NAME="buildbarguna-invest-db"
PERSIST_DIR="${PERSIST_DIR:-$(mktemp -d /tmp/bb-capital-refund.XXXXXX)}"
PORT="${PORT:-8792}"
BASE_URL="http://127.0.0.1:${PORT}"
LOG_FILE="${PERSIST_DIR}/wrangler-dev.log"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]] && kill -0 "${DEV_PID}" 2>/dev/null; then
    kill "${DEV_PID}" 2>/dev/null || true
    wait "${DEV_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

run_d1_file() {
  npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --file "$1" >/dev/null
}

run_d1_sql() {
  npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --command "$1" >/dev/null
}

run_d1_json() {
  npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --command "$1" --json
}

create_token() {
  node --input-type=module -e "
    import { createToken } from './src/lib/jwt.ts'
    const token = await createToken(
      { sub: process.argv[1], phone: process.argv[2], email: process.argv[3], role: process.argv[4], jti: process.argv[5] },
      'dev-secret-for-local-testing-only-32chars!!'
    )
    console.log(token)
  " "$1" "$2" "$3" "$4" "$5"
}

api() {
  local method="$1"
  local path="$2"
  local token="$3"
  local body="${4:-}"

  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "${BASE_URL}${path}" -H "Authorization: Bearer ${token}" -H 'Content-Type: application/json' --data "$body"
  else
    curl -sS -X "$method" "${BASE_URL}${path}" -H "Authorization: Bearer ${token}"
  fi
}

rm -rf "$PERSIST_DIR"
mkdir -p "$PERSIST_DIR"

run_d1_file "src/db/schema.sql"
run_d1_file "src/db/migrations/006_member_registration.sql"
run_d1_file "src/db/migrations/008_member_payment.sql"
run_d1_file "src/db/migrations/014_membership_edit_cancel_reapply.sql"
run_d1_file "src/db/migrations/024_user_balances_system.sql"
run_d1_file "src/db/migrations/026_finance_soft_delete.sql"
run_d1_file "src/db/migrations/027_profit_distribution_redesign.sql"
run_d1_file "src/db/migrations/028_profit_distribution_enhancements.sql"
run_d1_file "src/db/migrations/029_cash_withdrawal.sql"
run_d1_file "src/db/migrations/032_project_enhancement.sql"
run_d1_file "src/db/migrations/033_fix_project_status_check.sql"

run_d1_sql "
  INSERT INTO users (id, name, phone, email, password_hash, role, is_active)
  VALUES
    (1, 'Admin User', '01700000000', 'admin@example.com', 'hash123', 'admin', 1),
    (2, 'Member User', '01700000001', 'member@example.com', 'hash123', 'member', 1);

  INSERT INTO member_registrations (
    form_number, name_english, father_name, mother_name, date_of_birth,
    present_address, permanent_address, mobile_whatsapp, declaration_accepted,
    payment_method, payment_amount, payment_status, status, user_id
  ) VALUES (
    'FORM-CLOSE-001', 'Member User', 'Father', 'Mother', '1990-01-01',
    'Dhaka', 'Dhaka', '01700000001', 1,
    'cash', 10000, 'verified', 'active', 2
  );

  INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa)
  VALUES (2, 0, 0, 0);

  INSERT INTO projects (id, title, total_capital, total_shares, share_price, status, progress_pct, updated_at)
  VALUES (1, 'Capital Refund Trial', 1000000, 10, 100000, 'active', 0, datetime('now'));

  INSERT INTO user_shares (user_id, project_id, quantity)
  VALUES (2, 1, 2);
"

npx wrangler dev --local --persist-to "$PERSIST_DIR" --port "$PORT" --show-interactive-dev-session=false >"$LOG_FILE" 2>&1 &
DEV_PID=$!

for _ in {1..30}; do
  if curl -sS "${BASE_URL}/api/health/ready" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

ADMIN_TOKEN="$(create_token 1 01700000000 admin@example.com admin capital-admin)"
MEMBER_TOKEN="$(create_token 2 01700000001 member@example.com member capital-member)"

CLOSE_RESPONSE="$(api PATCH /api/admin/projects/1/status "$ADMIN_TOKEN" '{"status":"closed"}')"
BALANCE_RESPONSE="$(api GET /api/withdrawals/balance "$MEMBER_TOKEN")"
BREAKDOWN_RESPONSE="$(api GET /api/withdrawals/balance/breakdown "$MEMBER_TOKEN")"
EARNINGS_ROWS="$(run_d1_json "SELECT user_id, project_id, month, shares, amount FROM earnings ORDER BY id;")"
AUDIT_ROWS="$(run_d1_json "SELECT user_id, amount_paisa, reference_type, note FROM balance_audit_log ORDER BY id;")"
BALANCE_ROWS="$(run_d1_json "SELECT user_id, total_earned_paisa FROM user_balances ORDER BY user_id;")"

echo "CLOSE_RESPONSE=${CLOSE_RESPONSE}"
echo "BALANCE_RESPONSE=${BALANCE_RESPONSE}"
echo "BREAKDOWN_RESPONSE=${BREAKDOWN_RESPONSE}"
echo "EARNINGS_ROWS=${EARNINGS_ROWS}"
echo "AUDIT_ROWS=${AUDIT_ROWS}"
echo "BALANCE_ROWS=${BALANCE_ROWS}"
echo "WORKER_LOG=${LOG_FILE}"
echo "PERSIST_DIR=${PERSIST_DIR}"
