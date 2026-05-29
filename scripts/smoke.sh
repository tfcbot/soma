#!/usr/bin/env bash
# smoke.sh — machine-checkable proof the gateway is live & correct.
#
# Assumes a LOCAL anonymous Convex backend is already running (scripts/setup.sh starts one;
# or run `CONVEX_AGENT_MODE=anonymous bunx convex dev` yourself). Talks to it over HTTP and via
# `bunx convex run`. No jq — JSON is parsed with `bun -e`. No Stripe — fulfillment idempotency is
# checked through the DB seam directly.
#
# Usage:  bash scripts/smoke.sh [BASE_URL]
#   BASE_URL: arg $1, else $WORKSTATION_URL, else http://127.0.0.1:3211
#
# Exits non-zero on the FIRST failed assertion with a clear message; exits 0 + "SMOKE OK" if all pass.

set -euo pipefail

URL="${1:-${WORKSTATION_URL:-http://127.0.0.1:3211}}"
URL="${URL%/}" # strip a trailing slash so "$URL/v1/..." is always clean

export CONVEX_AGENT_MODE=anonymous

# ── helpers ──────────────────────────────────────────────────────────────────
say()  { echo "smoke: $*"; }
fail() { echo "SMOKE FAIL: $*" >&2; exit 1; }

# Parse a single field out of a JSON string with bun (no jq). $1=json $2=dotted.path
json_get() {
  bun -e '
    const [, path] = process.argv;
    let data = "";
    process.stdin.on("data", (c) => (data += c));
    process.stdin.on("end", () => {
      let v;
      try { v = JSON.parse(data); } catch { process.stdout.write(""); return; }
      for (const k of path.split(".")) { v = v == null ? undefined : v[k]; }
      process.stdout.write(v === undefined || v === null ? "" : String(v));
    });
  ' "$2" <<<"$1"
}

# HTTP status code only (drains body to /dev/null). Extra args are passed to curl.
http_status() {
  local u="$1"; shift
  curl -s -o /dev/null -w "%{http_code}" "$@" "$u"
}

# HTTP body only. Extra args are passed to curl.
http_body() {
  local u="$1"; shift
  curl -s "$@" "$u"
}

require_cmd() { command -v "$1" >/dev/null 2>&1 || fail "required command '$1' not found on PATH"; }

require_cmd curl
require_cmd bun
require_cmd bunx

say "target gateway: $URL"

# ── 0. backend reachable? (a no-key /v1/balance should answer 401) ──────────────
preflight="$(http_status "$URL/v1/balance" || true)"
[ "$preflight" = "401" ] || fail "backend not reachable at $URL (GET /v1/balance returned '$preflight', expected 401). Is the local backend running?"
say "backend reachable (no-key /v1/balance -> 401)"

# ── 1. mint a SCOPED, funded key (sandbox:exec only, 50 cents) ──────────────────
say "minting scoped funded key (scopes=[sandbox:exec], creditsCents=50) ..."
MINT_JSON="$(bunx convex run accounts:mintKey '{"label":"smoke","scopes":["sandbox:exec"],"creditsCents":50}' 2>/dev/null)" \
  || fail "accounts:mintKey failed (is the anonymous backend running?)"
KEY="$(json_get "$MINT_JSON" apiKey)"
ACC="$(json_get "$MINT_JSON" accountId)"
[ -n "$KEY" ] || fail "could not parse apiKey from mintKey output: $MINT_JSON"
[ -n "$ACC" ] || fail "could not parse accountId from mintKey output: $MINT_JSON"
say "minted key for account $ACC"

AUTH=(-H "Authorization: Bearer $KEY")
JSON_HDR=(-H "Content-Type: application/json")

# ── 2. GET /v1/balance -> 200, starting balance 50 ─────────────────────────────
BAL_BODY="$(http_body "$URL/v1/balance" "${AUTH[@]}")"
BAL_CODE="$(http_status "$URL/v1/balance" "${AUTH[@]}")"
[ "$BAL_CODE" = "200" ] || fail "GET /v1/balance with key returned $BAL_CODE (expected 200). body=$BAL_BODY"
START_BAL="$(json_get "$BAL_BODY" creditsCents)"
[ "$START_BAL" = "50" ] || fail "starting balance was '$START_BAL' (expected 50). body=$BAL_BODY"
say "GET /v1/balance -> 200, balance=$START_BAL"

# ── 3. metered op in scope: POST /v1/sandbox/exec -> 200, balance drops by costCents (10) ──
EXEC_BODY="$(http_body "$URL/v1/sandbox/exec" "${AUTH[@]}" "${JSON_HDR[@]}" -X POST -d '{"command":"echo hi"}')"
EXEC_CODE="$(http_status "$URL/v1/sandbox/exec" "${AUTH[@]}" "${JSON_HDR[@]}" -X POST -d '{"command":"echo hi"}')"
[ "$EXEC_CODE" = "200" ] || fail "POST /v1/sandbox/exec returned $EXEC_CODE (expected 200). body=$EXEC_BODY"
# The exec ran twice above (status + body). costCents for sandboxExec = 10, so 50 -> 30.
AFTER_BAL="$(json_get "$(http_body "$URL/v1/balance" "${AUTH[@]}")" creditsCents)"
EXPECT_AFTER=$(( START_BAL - 10 - 10 ))
[ "$AFTER_BAL" = "$EXPECT_AFTER" ] || fail "after 2 metered execs balance=$AFTER_BAL (expected $EXPECT_AFTER; costCents=10 each)"
say "POST /v1/sandbox/exec -> 200, metered 10c/call, balance now $AFTER_BAL"

# ── 4. no-key GET /v1/balance -> 401 ───────────────────────────────────────────
NOKEY_CODE="$(http_status "$URL/v1/balance")"
[ "$NOKEY_CODE" = "401" ] || fail "no-key GET /v1/balance returned $NOKEY_CODE (expected 401)"
say "no-key GET /v1/balance -> 401"

# ── 5. out-of-scope call: key is sandbox:exec only; PUT /v1/fs/objects (filesystem:write) -> 403 ──
OOS_BODY="$(http_body "$URL/v1/fs/objects" "${AUTH[@]}" "${JSON_HDR[@]}" -X PUT -d '{"path":"smoke.txt","data":"aGk="}')"
OOS_CODE="$(http_status "$URL/v1/fs/objects" "${AUTH[@]}" "${JSON_HDR[@]}" -X PUT -d '{"path":"smoke.txt","data":"aGk="}')"
[ "$OOS_CODE" = "403" ] || fail "out-of-scope PUT /v1/fs/objects returned $OOS_CODE (expected 403). body=$OOS_BODY"
say "out-of-scope PUT /v1/fs/objects -> 403"

# ── 6. optional rate-limit assertion (only if WORKSTATION_RATE_LIMIT_PER_MIN is set) ──
if [ -n "${WORKSTATION_RATE_LIMIT_PER_MIN:-}" ] && [ "${WORKSTATION_RATE_LIMIT_PER_MIN}" -gt 0 ] 2>/dev/null; then
  say "WORKSTATION_RATE_LIMIT_PER_MIN=$WORKSTATION_RATE_LIMIT_PER_MIN set; checking 429 on a free in-scope op ..."
  # Hammer a free, always-in-scope op (getBalance) past the per-minute cap; expect a 429 to appear.
  GOT_429=""
  n=0
  max=$(( WORKSTATION_RATE_LIMIT_PER_MIN + 5 ))
  while [ "$n" -lt "$max" ]; do
    code="$(http_status "$URL/v1/balance" "${AUTH[@]}")"
    if [ "$code" = "429" ]; then GOT_429="yes"; break; fi
    n=$(( n + 1 ))
  done
  [ -n "$GOT_429" ] || fail "rate limit set to $WORKSTATION_RATE_LIMIT_PER_MIN/min but never saw a 429 over $max requests"
  say "rate limit enforced -> 429 observed"
else
  say "WORKSTATION_RATE_LIMIT_PER_MIN unset; skipping 429 assertion"
fi

# ── 7. drain credits, then the metered op -> 402 with a topupUrl ────────────────
# Current balance is small (e.g. 30). One more exec at a time until under 10c, then assert 402.
say "draining remaining credits to force a 402 ..."
guard=0
while :; do
  cur="$(json_get "$(http_body "$URL/v1/balance" "${AUTH[@]}")" creditsCents)"
  [ -n "$cur" ] || fail "could not read balance while draining"
  [ "$cur" -ge 10 ] || break
  drain_code="$(http_status "$URL/v1/sandbox/exec" "${AUTH[@]}" "${JSON_HDR[@]}" -X POST -d '{"command":"echo drain"}')"
  [ "$drain_code" = "200" ] || fail "drain exec returned $drain_code (expected 200) at balance=$cur"
  guard=$(( guard + 1 ))
  [ "$guard" -lt 100 ] || fail "drain loop exceeded 100 iterations (balance not decreasing?)"
done

PR_BODY="$(http_body "$URL/v1/sandbox/exec" "${AUTH[@]}" "${JSON_HDR[@]}" -X POST -d '{"command":"echo broke"}')"
PR_CODE="$(http_status "$URL/v1/sandbox/exec" "${AUTH[@]}" "${JSON_HDR[@]}" -X POST -d '{"command":"echo broke"}')"
[ "$PR_CODE" = "402" ] || fail "metered op with insufficient credits returned $PR_CODE (expected 402). body=$PR_BODY"
TOPUP="$(json_get "$PR_BODY" topupUrl)"
[ -n "$TOPUP" ] || fail "402 body has no topupUrl. body=$PR_BODY"
say "drained -> POST /v1/sandbox/exec -> 402 with topupUrl=$TOPUP"

# ── 8. idempotency replay (no Stripe): topups:creditOnce twice ──────────────────
say "idempotency: topups:creditOnce twice (2nd must report already_credited) ..."
CO1="$(bunx convex run topups:creditOnce "{\"sessionId\":\"cs_smoke\",\"accountId\":\"$ACC\",\"amountCents\":100}" 2>/dev/null)" \
  || fail "topups:creditOnce (1st) failed"
CO1_CREDITED="$(json_get "$CO1" credited)"
[ "$CO1_CREDITED" = "true" ] || fail "topups:creditOnce (1st) credited='$CO1_CREDITED' (expected true). out=$CO1"

CO2="$(bunx convex run topups:creditOnce "{\"sessionId\":\"cs_smoke\",\"accountId\":\"$ACC\",\"amountCents\":100}" 2>/dev/null)" \
  || fail "topups:creditOnce (2nd) failed"
CO2_CREDITED="$(json_get "$CO2" credited)"
CO2_REASON="$(json_get "$CO2" reason)"
[ "$CO2_CREDITED" = "false" ] || fail "topups:creditOnce (2nd) credited='$CO2_CREDITED' (expected false). out=$CO2"
[ "$CO2_REASON" = "already_credited" ] || fail "topups:creditOnce (2nd) reason='$CO2_REASON' (expected already_credited). out=$CO2"
say "creditOnce idempotent (2nd -> already_credited)"

# ── 9. idempotency replay (no Stripe): storeClaim once, fulfill twice (2nd returns null) ──
say "idempotency: claims:storeClaim + claims:fulfill twice (2nd must return null) ..."
bunx convex run claims:storeClaim '{"claimToken":"claim_smoke","sessionId":"cs_smoke_claim"}' >/dev/null 2>&1 \
  || fail "claims:storeClaim failed"

F1="$(bunx convex run claims:fulfill '{"claimToken":"claim_smoke","creditsCents":100}' 2>/dev/null)" \
  || fail "claims:fulfill (1st) failed"
F1_KEY="$(json_get "$F1" apiKey)"
[ -n "$F1_KEY" ] || fail "claims:fulfill (1st) returned no apiKey (expected a minted key). out=$F1"

F2="$(bunx convex run claims:fulfill '{"claimToken":"claim_smoke","creditsCents":100}' 2>/dev/null)" \
  || fail "claims:fulfill (2nd) failed"
# A re-claim must return null (mint-once). `convex run` prints `null` for a null return.
F2_TRIM="$(printf '%s' "$F2" | tr -d '[:space:]')"
[ "$F2_TRIM" = "null" ] || fail "claims:fulfill (2nd) returned '$F2' (expected null — mint-once)"
say "fulfill idempotent (2nd -> null)"

echo "SMOKE OK"
