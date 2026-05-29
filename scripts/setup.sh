#!/usr/bin/env bash
# setup.sh — one command, clone-to-hello-world. Local, on mocks, NO login.
#
# Brings a fresh checkout to a proven-working state with zero vendor keys and no Convex browser
# login (CONVEX_AGENT_MODE=anonymous throughout):
#   pre-flight (bun, node>=22) -> bun install -> bun test -> bun run typecheck ->
#   start the anonymous local backend -> wait until the router answers ->
#   mint a funded dev key -> run scripts/smoke.sh against it.
#
# Re-runnable: detects an already-running backend instead of starting a second one.
#
# On any human-only requirement (e.g. a cloud login it cannot do headlessly) it prints
#   ACTION_REQUIRED: ...
# and exits with code 3 rather than hanging on an interactive prompt.
#
# Exit codes: 0 = all green; 2 = a gate failed (install/test/typecheck/smoke);
#             3 = ACTION_REQUIRED (human step needed); 4 = backend never came up.

set -euo pipefail

export CONVEX_AGENT_MODE=anonymous

# Resolve repo root from this script's location so it works from any cwd.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$ROOT"

URL="${WORKSTATION_URL:-http://127.0.0.1:3211}"
URL="${URL%/}"
LOG_DIR="$ROOT/.workstation"
BACKEND_LOG="$LOG_DIR/convex-dev.log"
BACKEND_PID_FILE="$LOG_DIR/convex-dev.pid"
READY_TIMEOUT="${WORKSTATION_READY_TIMEOUT:-120}" # seconds

# ── helpers ──────────────────────────────────────────────────────────────────
step() { echo; echo "==> $*"; }
say()  { echo "    $*"; }
fail() { echo "SETUP FAIL: $*" >&2; exit 2; }
action_required() { echo "ACTION_REQUIRED: $*" >&2; exit 3; }

http_status() { curl -s -o /dev/null -w "%{http_code}" "$@"; }

require_cmd() { command -v "$1" >/dev/null 2>&1; }

# ── 0. pre-flight ──────────────────────────────────────────────────────────────
step "Pre-flight: checking toolchain"
require_cmd bun  || action_required "Bun is not installed. Install it from https://bun.sh, then re-run."
require_cmd node || action_required "Node is not installed. Install Node >= 22 (e.g. 'nvm install 22'), then re-run."
require_cmd curl || action_required "curl is not installed. Install curl, then re-run."

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
if [ "${NODE_MAJOR:-0}" -lt 22 ] 2>/dev/null; then
  action_required "Node $(node -v 2>/dev/null) detected; Convex 1.31+ needs Node >= 22. Run 'nvm use 22' (or upgrade Node) and re-run."
fi
say "bun $(bun --version), node $(node -v)"
# Anonymous mode means convex never needs a browser login here.
say "CONVEX_AGENT_MODE=anonymous (no Convex login required for local mocks)"

mkdir -p "$LOG_DIR"

# ── 1. install ──────────────────────────────────────────────────────────────────
step "bun install"
bun install || fail "bun install failed"

# ── 2. gates: tests + typecheck (on mocks, no keys, no network) ─────────────────
step "bun test (gate)"
bun test || fail "bun test failed — fix unit tests before continuing"

step "bun run typecheck (gate)"
bun run typecheck || fail "bun run typecheck failed — fix type errors before continuing"

# ── 3. start (or detect) the anonymous local backend ────────────────────────────
backend_up() { [ "$(http_status "$URL/v1/balance" || true)" = "401" ]; }

step "Local backend (anonymous, no login)"
if backend_up; then
  say "backend already running at $URL — reusing it (idempotent re-run)"
else
  say "starting: CONVEX_AGENT_MODE=anonymous bunx convex dev  (logs -> $BACKEND_LOG)"
  # Detached so it survives this script; setup polls for readiness below.
  CONVEX_AGENT_MODE=anonymous nohup bunx convex dev >"$BACKEND_LOG" 2>&1 &
  echo $! >"$BACKEND_PID_FILE"
  say "backend pid $(cat "$BACKEND_PID_FILE") — to stop it later: kill \$(cat $BACKEND_PID_FILE)"
fi

# ── 4. readiness poll — the router is up once /v1/balance answers (expects 401) ──
step "Waiting for the gateway to accept requests (up to ${READY_TIMEOUT}s)"
waited=0
until backend_up; do
  # If we launched a backend and it has already died, surface the log instead of hanging.
  if [ -f "$BACKEND_PID_FILE" ]; then
    pid="$(cat "$BACKEND_PID_FILE" 2>/dev/null || true)"
    if [ -n "${pid:-}" ] && ! kill -0 "$pid" 2>/dev/null; then
      echo "----- last 30 lines of $BACKEND_LOG -----" >&2
      tail -n 30 "$BACKEND_LOG" >&2 2>/dev/null || true
      # An anonymous backend that exits asking to log in is a human step, not a bug.
      if grep -qiE "log ?in|authenticate|browser" "$BACKEND_LOG" 2>/dev/null; then
        action_required "Convex wants an interactive login. This script uses anonymous mode; ensure CONVEX_AGENT_MODE=anonymous is honored, or run 'npx convex login' once."
      fi
      fail "the local backend exited before becoming ready (see log above)"
    fi
  fi
  if [ "$waited" -ge "$READY_TIMEOUT" ]; then
    echo "----- last 30 lines of $BACKEND_LOG -----" >&2
    tail -n 30 "$BACKEND_LOG" >&2 2>/dev/null || true
    echo "the local backend did not answer at $URL within ${READY_TIMEOUT}s" >&2
    exit 4
  fi
  sleep 2
  waited=$(( waited + 2 ))
done
say "gateway is up at $URL (no-key /v1/balance -> 401)"

# ── 5. mint a funded dev key (full access — empty scopes) ───────────────────────
step "Minting a local dev key (full access, funded)"
MINT_JSON="$(bunx convex run accounts:mintKey '{"label":"dev","creditsCents":100000}' 2>/dev/null)" \
  || fail "accounts:mintKey failed"
KEY="$(
  bun -e '
    let d=""; process.stdin.on("data",c=>d+=c);
    process.stdin.on("end",()=>{try{process.stdout.write(JSON.parse(d).apiKey??"")}catch{process.stdout.write("")}});
  ' <<<"$MINT_JSON"
)"
[ -n "$KEY" ] || fail "could not parse apiKey from mintKey output: $MINT_JSON"

echo
echo "──────────────────────────────────────────────────────────────────────"
echo "  Workstation is live locally (mocks, no login)."
echo "  URL: $URL"
echo "  KEY: $KEY"
echo "  Try it:"
echo "    curl -s $URL/v1/balance -H \"Authorization: Bearer \$KEY\""
echo "    curl -s -X POST $URL/v1/sandbox/exec -H \"Authorization: Bearer \$KEY\" \\"
echo "      -H 'Content-Type: application/json' -d '{\"command\":\"echo hi\"}'"
echo "──────────────────────────────────────────────────────────────────────"

# ── 6. prove correctness with the smoke gate ────────────────────────────────────
step "Running smoke test against $URL"
bash "$SCRIPT_DIR/smoke.sh" "$URL" || fail "smoke test failed — the gateway is up but not behaving correctly (see output above)"

echo
echo "SETUP OK — hello world verified. Backend is still running at $URL."
if [ -f "$BACKEND_PID_FILE" ]; then
  echo "  (started by this run; stop it with: kill \$(cat $BACKEND_PID_FILE))"
fi
