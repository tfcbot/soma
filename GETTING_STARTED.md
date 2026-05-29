# Getting Started

Run the single-node reference implementation (SPEC.md §11): a hexagonal core fronted by an
API-key-protected Convex backend. It runs **end-to-end on mock adapters with zero vendor keys**
— connect real providers one at a time as you go.

## Prerequisites

- [Bun](https://bun.sh)
- **Node 22** (Convex 1.31+ requires it — `nvm use 22`)
- A [Convex](https://convex.dev) account (free; only needed to go hosted — local dev runs without one)
- Vendor accounts are **optional** — any capability without a key runs on its mock.

## 1. Install

```bash
bun install
```

## 2. Start Convex (local, no login)

Start the backend on a local anonymous deployment — no browser login, no Convex account needed:

```bash
CONVEX_AGENT_MODE=anonymous bunx convex dev
```

This provisions a local deployment, applies the schema, and generates types in
`convex/_generated/`. It serves on `http://127.0.0.1:3211`. Leave it running.

> **Go hosted (later).** When you're ready to deploy to Convex Cloud, log in once and push:
> `bunx convex login` then `bunx convex deploy`. The cloud deployment serves at a
> `https://<name>.convex.site` URL.

## 3. Mint an API key (required)

There is no single gateway key. You (the operator) mint per-key accounts; each bearer key
resolves to an account with a credit balance. Mint your first (prints the plaintext key once):

```bash
bunx convex run accounts:mintKey '{"label":"owner","creditsCents":100000}'
```

Billing applies uniformly — there is no built-in admin/free tier. Zero-cost operations work on
any key; to give free access set an op's `costCents` to 0 or mint a large balance. Per-op costs
are the `costCents` field on each op in `modules/<cap>/operations.ts` (merged into
`packages/contract/src/operations.ts`). To add credits to a key, call the funding
seam: `bunx convex run accounts:grantCredits '{"accountId":"acc_…","amountCents":5000}'`.
Workstation ships no payment processor — wire that to your own rail (manual, a monthly grant, or a
payment webhook such as `@convex-dev/stripe`). Optional abuse protection: `WORKSTATION_RATE_LIMIT_PER_MIN`.

## 4. Connect your providers (optional)

The repo ships **two reference capabilities**. Omit a capability's keys and it runs on its mock.
Set them on the deployment (local: `CONVEX_AGENT_MODE=anonymous bunx convex env set NAME value`):

| Capability | Env var(s) | Adapter | Omit → |
|---|---|---|---|
| Computer (Sandbox) | `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` | Vercel Sandbox (persistent microVM) | mock |
| Storage (FileSystem) | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_ACCESS_KEY_SECRET`, `R2_BUCKET_NAME`, `CDN_BASE_URL` | Cloudflare R2 (S3 API) + CDN | mock |

```bash
# … and so on for the capabilities you want live
```

> Note: the real vendor adapters (`modules/sandbox/vercel.ts`, `modules/filesystem/r2.ts`) are
> coded against the real SDKs. They activate when their env keys are set and fall back to the mock
> when absent — they do **not** throw. They are simply not yet exhaustively live-round-trip-tested.

## 5. Try it

A local deployment serves at `http://127.0.0.1:3211` (a hosted one prints an
`https://<name>.convex.site` URL). Then:

```bash
URL="http://127.0.0.1:3211"
KEY="<the apiKey from accounts:mintKey>"

# Check your balance (free)
curl -s "$URL/v1/balance" -H "Authorization: Bearer $KEY"

# Run code in the sandbox; write/read a file; list storage
curl -s -X POST "$URL/v1/sandbox/exec" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"command":"echo hi"}'

# See your usage events
curl -s "$URL/v1/events" -H "Authorization: Bearer $KEY"

# Missing/wrong key → 401
curl -s -o /dev/null -w "%{http_code}\n" "$URL/v1/balance"
```

A metered key with too few credits gets **402** (with a `topupUrl`); an over-rate key gets **429**.

## 6. Point your agent at it

An agent (Claude) drives the capabilities over these endpoints. The `workstation` SDK (`packages/sdk`) gives
typed methods; `packages/mcp` exposes one MCP tool per operation; `packages/cli` one command each —
all derived from `packages/contract`. Point any of them at your `baseUrl` + an account API key.

## Tests & typecheck

```bash
bun test                # core domain (state machine) tests
bun run typecheck       # typechecks the pure hexagon (core + adapters + mcp)
```

The `convex/` tree typechecks under `CONVEX_AGENT_MODE=anonymous bunx convex dev` once
`_generated/` exists.

## Layout

```
packages/contract/  the typed operation registry (Zod) + port interfaces — the single source of truth
core/        pure domain: credits + rate-limit math (+ tests). No vendor code.
modules/     one folder per capability — operations + a real adapter + a mock + server wiring
             (sandbox, filesystem; account = gateway-only ops)
convex/      the host / gateway — schema, DB fns, auth, composition root, HTTP router
packages/{sdk,cli,mcp}/  all derived from packages/contract (no codegen — shared types)
apps/web/    Next.js front door — landing + /success + /cancel
docs/        Mintlify scaffold — guides + API Reference auto-rendered from the contract
```

See [SPEC.md](./SPEC.md) for the protocol and [SCENARIOS.md](./SCENARIOS.md) for the worked
creative-agency example.
