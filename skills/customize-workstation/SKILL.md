---
name: customize-workstation
description: Customize a Workstation deployment for a user's needs — scaffold new capability primitives (modules), wire vendor env vars/secrets, mint scoped API keys with credits, and deploy the metered gateway. Use when setting up, onboarding, customizing, securing, or extending a Workstation repo — e.g. "set up my workstation", "add a <vendor> primitive", "configure keys/scopes", "make it free for personal use", "launch the backend", or standing up a vertical (store/ads/etc.).
compatibility: For an AI coding agent (e.g. Claude Code) working inside a cloned Workstation repo. Requires git, bun, and the Convex CLI. Live vendors need their own accounts/keys.
license: MIT
metadata:
  author: tfcbot
  project: workstation
---

# Customize a Workstation

Workstation is a headless contract for agents that do work: five primitives (phone, email,
wallet, computer, storage) behind one metered gateway (per-key accounts, credits, rate limits,
scopes, an event ledger). This skill walks a user from a fresh clone to a customized, secured,
deployed Workstation. **Read `AGENTS.md` at the repo root first** — it has the canonical
add-a-capability recipe and the import rules; this skill is the interactive journey around it.

Work in small, verified steps. Confirm each step before moving on.

## Step 0 — Baseline (prove it runs)
1. Ensure you're inside a Workstation clone (`git clone https://github.com/tfcbot/workstation.git` if not), then `bun install`.
2. `bun run typecheck` and `bun test` — should pass on mocks, no keys needed.
3. `CONVEX_AGENT_MODE=anonymous bunx convex dev --once --typecheck enable` — confirms the backend codegens/typechecks.

## Step 1 — Gather the user's needs (ask, don't assume)
- What is this Workstation *for* (personal use, or a service you run for others/clients)?
- Which of the five primitives do they need live vs mock?
- Any **new capability** to add (a vendor/vertical, e.g. a `store` primitive over Shopify)?
- **Metered or free?** Personal → free; service → metered (per-call credits). This is per-endpoint.
- **Access:** one full-access key, or scoped keys (e.g. a client key limited to `store:*` + `email:send`)?

## Step 2 — Add a capability (if needed) — follow AGENTS.md
For a new vendor primitive `xyz`, create **one folder** `modules/xyz/` and make 3 one-line registrations (full recipe + import rules in `AGENTS.md`):
1. `modules/xyz/operations.ts` — Zod schemas + ops + the `XyzPort` interface. Each op sets
   `serve: { port: "xyz", method: "..." }`, a `costCents` (0 = free), and optionally `metered: false`.
2. `modules/xyz/xyzvendor.ts` (+ `mock.ts`) — `implements XyzPort` (a mismatch fails `tsc`).
3. `modules/xyz/server.ts` — `buildXyz(env)`: real adapter if env keys present, else mock.
4. Register: spread `ops` in `packages/contract/src/operations.ts`, add `xyz: XyzPort` to `Ports`
   in `packages/contract/src/ports.ts`, add `xyz: buildXyz(env)` in `convex/ports.ts`.
5. If the adapter needs a vendor SDK, add it to `convex.json` `node.externalPackages` + `bun add` it.
Never edit `gateway.ts` / `invoke.ts` / `http.ts` — they're generic. Re-run typecheck + `convex dev`.

## Step 3 — Wire the environment (the manual, human-only parts)
An agent can do everything except create vendor identities. Tell the user exactly which steps
they must do themselves, then set the resulting secrets as Convex env vars:
- **Email** (AgentMail): create an inbox → `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID`.
- **Phone** (AgentPhone): get an agent/number → `AGENTPHONE_API_KEY`, `AGENTPHONE_AGENT_ID`; live SMS needs A2P 10DLC registration.
- **Wallet** (AgentCard): complete KYC, create a cardholder → `AGENTCARD_API_KEY`, `AGENTCARD_CARDHOLDER_ID`.
- **Computer** (Freestyle): API key → `FREESTYLE_API_KEY`.
- **Storage** (R2/Archil): bucket + CDN → `R2_*`, `ARCHIL_DISK_ID`, `CDN_BASE_URL`.
- **Gateway:** optional `WORKSTATION_RATE_LIMIT_PER_MIN`, `WORKSTATION_TOPUP_URL`, `WORKSTATION_WEBHOOK_URL`.
Set each with `bunx convex env set NAME value`. Any primitive whose keys are absent runs on its mock.

## Step 4 — Secure + provision (keys, scopes, credits)
There is no single gateway key — every caller uses a minted account key.
- Mint a key: `bunx convex run accounts:mintKey '{"label":"...","creditsCents":N,"scopes":[...]}'` (prints the plaintext key once).
- **Scopes** are granular allow-patterns: `"*"` (all), `"store:*"` (a whole primitive), `"store:listProducts"` (one op). Empty scopes = full environment. Gateway ops (`balance`,`events`) are always allowed. Out-of-scope calls return `403`.
- **Free vs paid:** for personal use, leave costs at 0 or set `metered: false` on the ops; for a service, set `costCents` and fund keys with `creditsCents` (top up later via `accounts:grantCredits`). Denied/over-budget calls aren't charged.

## Step 5 — Deploy + smoke test
1. Deploy: `bunx convex dev` (local) or your hosted Convex deployment.
2. Call a primitive with the key:
   `curl -s -X POST $URL/v1/phone/messages -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" -d '{"to":"+1...","body":"hi"}'`
3. Confirm `GET /v1/balance` reflects spend and `GET /v1/events` shows the call. Out-of-scope key → 403; exhausted metered key → 402; unknown key → 401.

## Guardrails
- Never log `pan`/`cvv` from the wallet.
- Never expose the credit-grant seam (`accounts:grantCredits`) on a caller-facing route.
- Keep secrets in Convex env vars, never in code or the repo.
- Regenerate the OpenAPI spec after contract changes: `bun scripts/gen-openapi.ts`.

## References
- `AGENTS.md` (repo root) — the canonical add-a-capability recipe + import rules.
- `SPEC.md` — the normative protocol (primitives, gateway, metering, scopes, events).
