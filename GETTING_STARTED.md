# Getting Started

Run the single-node reference implementation (SPEC.md §16): a hexagonal core fronted by an
API-key-protected Convex backend. It runs **end-to-end on mock adapters with zero vendor keys**
— connect real providers one at a time as you go.

## Prerequisites

- [Bun](https://bun.sh)
- **Node 22** (Convex 1.31+ requires it — `nvm use 22`)
- A [Convex](https://convex.dev) account (free; this is the host)
- Vendor accounts are **optional** — any primitive without a key runs on its mock.

## 1. Install

```bash
bun install
```

## 2. Start Convex

```bash
npx convex dev --until-success
```

This logs you in, provisions a dev deployment, applies the schema, and generates types in
`convex/_generated/`. Leave it running.

## 3. Mint an API key (required)

There is no single gateway key. You (the operator) mint per-key accounts; each bearer key
resolves to an account with a credit balance. Mint your first (prints the plaintext key once):

```bash
npx convex run accounts:mintKey '{"label":"owner","creditsCents":100000}'
```

Billing applies uniformly — there is no built-in admin/free tier. Zero-cost operations work on
any key; to give free access set per-op cost to 0 in `core/domain/pricing.ts` or mint a large
balance. Per-op prices live in that one file. To add credits to a key, call the funding
seam: `bunx convex run accounts:grantCredits '{"accountId":"acc_…","amountCents":5000}'`.
Workstation ships no payment processor — wire that to your own rail (manual, a monthly grant, or a
payment webhook such as `@convex-dev/stripe`). Optional abuse protection: `WORKSTATION_RATE_LIMIT_PER_MIN`.

## 4. Connect your providers (optional)

Omit any of these and that primitive runs on its mock. Set them on the deployment:

| Primitive | Env var(s) | Adapter | Omit → |
|---|---|---|---|
| Phone | `AGENTPHONE_API_KEY`, `AGENTPHONE_AGENT_ID` | AgentPhone | mock |
| Email | `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID` | AgentMail | mock |
| Wallet | `AGENTCARD_API_KEY`, `AGENTCARD_CARDHOLDER_ID` | AgentCard | mock |
| Sandbox | `FREESTYLE_API_KEY` | Freestyle VM + git | mock |
| FileSystem | `ARCHIL_DISK_ID`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_ACCESS_KEY_SECRET`, `R2_BUCKET_NAME`, `CDN_BASE_URL` | Archil disk + R2 (personal CDN) | mock |
| Todo | _(none)_ | Convex DB | always real |

```bash
npx convex env set AGENTMAIL_API_KEY "…"
npx convex env set AGENTMAIL_INBOX_ID "…"
# … and so on for the primitives you want live
```

> Note: the real vendor adapters are currently typed stubs that throw — they're gated on the
> open questions in SPEC.md §15. Until those are wired, leave the keys unset to use the mocks.

## 5. Try it

Convex prints your HTTP URL (looks like `https://<name>.convex.site`). Then:

```bash
URL="https://<name>.convex.site"
KEY="<the apiKey from accounts:mintKey>"

# Check your balance (free)
curl -s "$URL/v1/balance" -H "Authorization: Bearer $KEY"

# Call a primitive — send an SMS (debits the key's credits per the op's cost)
curl -s -X POST "$URL/v1/phone/messages" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"to":"+15551230000","body":"hello from the body"}'

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

An agent (Claude) drives the primitives over these endpoints. The `workstation` SDK (`packages/sdk`) gives
typed methods; `packages/mcp` exposes one MCP tool per primitive; `packages/cli` one command each —
all derived from `packages/contract`. Point any of them at your `baseUrl` + an account API key.

## Tests & typecheck

```bash
bun test                # core domain (state machine) tests
bun run typecheck       # typechecks the pure hexagon (core + adapters + mcp)
```

The `convex/` tree typechecks under `npx convex dev` once `_generated/` exists.

## Layout

```
core/      pure hexagon — the 5 primitive ports, domain (credits, ratelimit); packages/contract = registry
adapters/  one folder per vendor: real adapter + parallel mock
convex/    the host — schema, DB fns, auth, composition root, HTTP router
mcp/       dependency-free gateway client for agents
```

See [SPEC.md](./SPEC.md) for the protocol and [SCENARIOS.md](./SCENARIOS.md) for the worked
creative-agency example.
