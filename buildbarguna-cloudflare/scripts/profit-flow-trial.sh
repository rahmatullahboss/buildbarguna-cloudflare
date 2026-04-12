#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

DB_NAME="buildbarguna-invest-db"
PERSIST_DIR="${PERSIST_DIR:-$(mktemp -d /tmp/bb-profit-flow.XXXXXX)}"
PORT="${PORT:-8791}"
BASE_URL="http://127.0.0.1:${PORT}"
LOG_FILE="${PERSIST_DIR}/wrangler-dev.log"

cleanup() {
  if [[ -n "${DEV_PID:-}" ]] && kill -0 "${DEV_PID}" 2>/dev/null; then
    kill "${DEV_PID}" 2>/dev/null || true
    wait "${DEV_PID}" 2>/dev/null || true
  fi
}
trap cleanup EXIT

mkdir -p "$PERSIST_DIR"
rm -f "$LOG_FILE"

run_d1_file() {
  local file_path="$1"
  npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --file "$file_path" >/dev/null
}

run_d1_sql() {
  local sql="$1"
  npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --command "$sql" >/dev/null
}

json_get() {
  local json="$1"
  local expr="$2"
  node -e "const input = JSON.parse(process.argv[1]); const expr = process.argv[2].split('.'); let cur = input; for (const key of expr) cur = cur?.[key]; if (cur === undefined) process.exit(2); if (typeof cur === 'object') console.log(JSON.stringify(cur)); else console.log(String(cur));" "$json" "$expr"
}

create_token() {
  local sub="$1"
  local phone="$2"
  local email="$3"
  local role="$4"
  local jti="$5"

  node --input-type=module -e "
    import { createToken } from './src/lib/jwt.ts'
    const token = await createToken(
      { sub: process.argv[1], phone: process.argv[2], email: process.argv[3], role: process.argv[4], jti: process.argv[5] },
      'dev-secret-for-local-testing-only-32chars!!'
    )
    console.log(token)
  " "$sub" "$phone" "$email" "$role" "$jti"
}

api() {
  local method="$1"
  local path="$2"
  local token="$3"
  local body="${4:-}"
  local auth_header=()

  if [[ -n "$token" ]]; then
    auth_header=(-H "Authorization: Bearer ${token}")
  fi

  if [[ -n "$body" ]]; then
    curl -sS -X "$method" "${BASE_URL}${path}" "${auth_header[@]}" -H 'Content-Type: application/json' --data "$body"
  else
    curl -sS -X "$method" "${BASE_URL}${path}" "${auth_header[@]}"
  fi
}

echo "[1/8] Initializing isolated local database at ${PERSIST_DIR}"
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

echo "[2/8] Seeding admin/member accounts and wallet rows"
run_d1_sql "
  DELETE FROM withdrawals;
  DELETE FROM balance_audit_log;
  DELETE FROM user_balances;
  DELETE FROM shareholder_profits;
  DELETE FROM profit_distributions;
  DELETE FROM earnings;
  DELETE FROM project_transactions;
  DELETE FROM expense_allocations;
  DELETE FROM share_purchases;
  DELETE FROM user_shares;
  DELETE FROM member_registrations;
  DELETE FROM referral_bonuses;
  DELETE FROM token_blacklist;
  DELETE FROM projects;
  DELETE FROM users;

  INSERT INTO users (id, name, phone, email, password_hash, role, is_active)
  VALUES
    (1, 'Admin User', '01700000000', 'admin@example.com', 'hash123', 'admin', 1),
    (2, 'Investor One', '01700000001', 'member1@example.com', 'hash123', 'member', 1),
    (3, 'Investor Two', '01700000002', 'member2@example.com', 'hash123', 'member', 1);

  INSERT INTO member_registrations (
    form_number, name_english, father_name, mother_name, date_of_birth,
    present_address, permanent_address, mobile_whatsapp, declaration_accepted,
    payment_method, payment_amount, payment_status, status, user_id
  ) VALUES
    ('FORM-TRIAL-001', 'Investor One', 'Father One', 'Mother One', '1990-01-01', 'Dhaka', 'Dhaka', '01700000001', 1, 'cash', 10000, 'verified', 'active', 2),
    ('FORM-TRIAL-002', 'Investor Two', 'Father Two', 'Mother Two', '1991-01-01', 'Dhaka', 'Dhaka', '01700000002', 1, 'cash', 10000, 'verified', 'active', 3);

  INSERT INTO user_balances (user_id, total_earned_paisa, total_withdrawn_paisa, reserved_paisa)
  VALUES
    (2, 0, 0, 0),
    (3, 0, 0, 0);
"

echo "[3/8] Starting local worker"
npx wrangler dev --local --persist-to "$PERSIST_DIR" --port "$PORT" --show-interactive-dev-session=false >"$LOG_FILE" 2>&1 &
DEV_PID=$!

for _ in {1..40}; do
  if curl -sS "${BASE_URL}/api/health/ready" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sS "${BASE_URL}/api/health/ready" >/dev/null 2>&1; then
  echo "Worker failed to start. Recent log:"
  tail -n 60 "$LOG_FILE" || true
  exit 1
fi

ADMIN_TOKEN="$(create_token 1 01700000000 admin@example.com admin trial-admin)"
MEMBER1_TOKEN="$(create_token 2 01700000001 member1@example.com member trial-member-1)"
MEMBER2_TOKEN="$(create_token 3 01700000002 member2@example.com member trial-member-2)"

echo "[4/8] Running clean profit-distribution flow"
project_response="$(api POST /api/admin/projects "$ADMIN_TOKEN" '{"title":"Trial Profit Project","total_capital":10000000,"total_shares":100,"share_price":100000,"status":"active","progress_pct":0}')"
project_id="$(json_get "$project_response" 'data.id')"

buy1_response="$(api POST /api/shares/buy "$MEMBER1_TOKEN" "{\"project_id\":${project_id},\"quantity\":10,\"payment_method\":\"manual\"}")"
buy2_response="$(api POST /api/shares/buy "$MEMBER2_TOKEN" "{\"project_id\":${project_id},\"quantity\":5,\"payment_method\":\"manual\"}")"
purchase1_id="$(json_get "$buy1_response" 'data.purchase_id')"
purchase2_id="$(json_get "$buy2_response" 'data.purchase_id')"

approve1_response="$(api PATCH "/api/admin/shares/${purchase1_id}/approve" "$ADMIN_TOKEN")"
approve2_response="$(api PATCH "/api/admin/shares/${purchase2_id}/approve" "$ADMIN_TOKEN")"
json_get "$approve1_response" 'success' >/dev/null
json_get "$approve2_response" 'success' >/dev/null

api POST /api/finance/transactions "$ADMIN_TOKEN" "{\"project_id\":${project_id},\"transaction_type\":\"revenue\",\"amount\":1000000,\"category\":\"Sales\"}" >/dev/null
api POST /api/finance/transactions "$ADMIN_TOKEN" "{\"project_id\":${project_id},\"transaction_type\":\"expense\",\"amount\":200000,\"category\":\"Operational\"}" >/dev/null

preview_response="$(api GET "/api/profit/preview/${project_id}?company_pct=30" "$ADMIN_TOKEN")"
preview_available="$(json_get "$preview_response" 'data.summary.available_profit')"
preview_investor_pool="$(json_get "$preview_response" 'data.summary.investor_pool')"

distribution_response="$(api POST "/api/profit/distribute/${project_id}" "$ADMIN_TOKEN" '{"company_share_percentage":30,"period_start":"2026-04-01","period_end":"2026-04-30","notes":"Automated trial"}')"
distribution_total="$(json_get "$distribution_response" 'data.total_distributed')"

member1_balance="$(api GET /api/withdrawals/balance "$MEMBER1_TOKEN")"
member1_breakdown="$(api GET /api/withdrawals/balance/breakdown "$MEMBER1_TOKEN")"
member2_balance="$(api GET /api/withdrawals/balance "$MEMBER2_TOKEN")"
member2_breakdown="$(api GET /api/withdrawals/balance/breakdown "$MEMBER2_TOKEN")"

member1_available="$(json_get "$member1_balance" 'data.available_paisa')"
member2_available="$(json_get "$member2_balance" 'data.available_paisa')"

echo "[5/8] Running loss-only flow check"
loss_project_response="$(api POST /api/admin/projects "$ADMIN_TOKEN" '{"title":"Trial Loss Project","total_capital":5000000,"total_shares":50,"share_price":100000,"status":"active","progress_pct":0}')"
loss_project_id="$(json_get "$loss_project_response" 'data.id')"

loss_buy_response="$(api POST /api/shares/buy "$MEMBER1_TOKEN" "{\"project_id\":${loss_project_id},\"quantity\":2,\"payment_method\":\"manual\"}")"
loss_purchase_id="$(json_get "$loss_buy_response" 'data.purchase_id')"
api PATCH "/api/admin/shares/${loss_purchase_id}/approve" "$ADMIN_TOKEN" >/dev/null
api POST /api/finance/transactions "$ADMIN_TOKEN" "{\"project_id\":${loss_project_id},\"transaction_type\":\"revenue\",\"amount\":100000,\"category\":\"Sales\"}" >/dev/null
api POST /api/finance/transactions "$ADMIN_TOKEN" "{\"project_id\":${loss_project_id},\"transaction_type\":\"expense\",\"amount\":150000,\"category\":\"Loss\"}" >/dev/null

loss_preview="$(api GET "/api/profit/preview/${loss_project_id}?company_pct=30" "$ADMIN_TOKEN")"
loss_available="$(json_get "$loss_preview" 'data.summary.available_profit')"
loss_has_profit="$(json_get "$loss_preview" 'data.has_available_profit')"
loss_distribute="$(api POST "/api/profit/distribute/${loss_project_id}" "$ADMIN_TOKEN" '{"company_share_percentage":30,"period_start":"2026-05-01","period_end":"2026-05-31"}')"

echo "[6/8] Simulating explicit balance drift of exactly ৳100"
run_d1_sql "UPDATE user_balances SET total_earned_paisa = total_earned_paisa + 10000, updated_at = datetime('now') WHERE user_id = 2;"
drift_breakdown="$(api GET /api/withdrawals/balance/breakdown "$MEMBER1_TOKEN")"
drift_total="$(json_get "$drift_breakdown" 'data.total_earned_paisa')"
drift_other_amount="$(node -e "const json = JSON.parse(process.argv[1]); const other = (json.data.breakdown || []).find(item => item.source === 'other'); console.log(other ? other.amount_paisa : 0);" "$drift_breakdown")"
drift_other_label="$(node -e "const json = JSON.parse(process.argv[1]); const other = (json.data.breakdown || []).find(item => item.source === 'other'); console.log(other ? other.label : '');" "$drift_breakdown")"

echo "[7/8] Collecting database proof rows"
member1_earnings="$(npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --command "SELECT user_id, project_id, month, shares, rate, amount FROM earnings WHERE user_id = 2 ORDER BY id;" --json)"
member2_earnings="$(npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --command "SELECT user_id, project_id, month, shares, rate, amount FROM earnings WHERE user_id = 3 ORDER BY id;" --json)"
distribution_rows="$(npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --command "SELECT id, project_id, net_profit, distributable_amount, company_share_amount, total_distributed_amount, status FROM profit_distributions ORDER BY id;" --json)"
shareholder_rows="$(npx wrangler d1 execute "$DB_NAME" --local --persist-to "$PERSIST_DIR" --command "SELECT user_id, project_id, shares_held, ownership_percentage, profit_amount FROM shareholder_profits ORDER BY id;" --json)"

echo "[8/8] Trial summary"
cat <<EOF

Clean profit flow:
- Preview available profit: ${preview_available} paisa
- Preview investor pool: ${preview_investor_pool} paisa
- Distribution total: ${distribution_total} paisa
- Member 1 withdrawable: ${member1_available} paisa
- Member 2 withdrawable: ${member2_available} paisa

Expected clean distribution:
- Net profit = 1,000,000 - 200,000 = 800,000 paisa
- Company share (30%) = 240,000 paisa
- Investor pool (70%) = 560,000 paisa
- Share split: user 2 owns 10/15, user 3 owns 5/15
- Expected user 2 = floor(560,000 * 10 / 15) = 373,333 paisa
- Expected user 3 = remainder = 186,667 paisa

Loss flow:
- Preview available profit: ${loss_available} paisa
- has_available_profit: ${loss_has_profit}
- Distribute response: ${loss_distribute}

Forced drift scenario:
- Drifted total earned: ${drift_total} paisa
- 'other' bucket label: ${drift_other_label}
- 'other' bucket amount: ${drift_other_amount} paisa

DB rows:
Member 1 earnings: ${member1_earnings}
Member 2 earnings: ${member2_earnings}
Distributions: ${distribution_rows}
Shareholder profits: ${shareholder_rows}

Worker log: ${LOG_FILE}
Persist dir: ${PERSIST_DIR}
EOF
