---
name: customize-workstation
description: Take a user from nothing to a deployed, paid Workstation. Phase 1 — clone the repo into a clean dedicated dir as their own private repo, run it locally on mocks, and prove a "hello world" call works end-to-end (no vendor accounts). Phase 2 — walk the deployment path: host on Convex Cloud, connect real vendors, set metering, and mint scoped funded keys. Use when a user wants to set up, onboard, stand up, customize, or launch their own Workstation / agent backend.
compatibility: For an AI coding agent (e.g. Claude Code) on the user's machine. Requires git, bun, gh, and the Convex CLI. Live vendors and a hosted deploy need the user's own accounts/keys.
license: MIT
metadata:
  author: tfcbot
  project: workstation
---

# Set up a Workstation

Workstation is a headless contract for agents that do work: five primitives (phone, email,
wallet, computer, storage) behind one metered gateway (per-key accounts, credits, rate limits,
scopes, an event ledger). This skill takes a user from nothing to a deployed paid Workstation in
two phases. **Get Phase 1 green before starting Phase 2.** Work in small, verified steps; confirm
each before moving on. The repo's `AGENTS.md` has the canonical add-a-capability recipe.

---

## Phase 0 — The project (a clone, not a fork)
Recommend a **clean, dedicated, top-level directory named for the project** (e.g.
`~/products/acme-workstation`) — not nested inside another project.

1. Clone (independent copy, not a GitHub fork):
   ```bash
   git clone https://github.com/tfcbot/workstation.git acme-workstation
   cd acme-workstation
   ```
2. Make it the user's **own private repo**, keeping our repo as a read-only `upstream` so they can
   pull future improvements. Check `gh auth status` first (prompt `gh auth login` if needed):
   ```bash
   git remote rename origin upstream
   gh repo create <user>/acme-workstation --private --source=. --remote=origin --push
   ```
   Now `origin` = their private repo; `git pull upstream master` later pulls upstream updates.
3. `bun install`.

## Phase 1 — Hello world, local, on mocks (NO vendor accounts)
Goal: prove the whole loop works locally before touching any vendor. Every primitive has a mock,
so this needs zero external keys and no Convex login.

1. `bun run typecheck` and `bun test` — green on mocks.
2. Start the local backend (anonymous, no login):
   ```bash
   CONVEX_AGENT_MODE=anonymous bunx convex dev
   ```
3. Mint a local dev key (full access, funded):
   ```bash
   KEY=$(CONVEX_AGENT_MODE=anonymous bunx convex run accounts:mintKey '{"label":"dev","creditsCents":100000}' | jq -r .apiKey)
   ```
4. **Hello world** — call a primitive on its mock:
   ```bash
   curl -s -X POST http://127.0.0.1:3211/v1/phone/messages \
     -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
     -d '{"to":"+15551230000","body":"hello workstation"}'      # → {"id":"sms_mock_1"}
   ```
5. Confirm the gateway works: `GET /v1/balance` (credits debited), `GET /v1/events` (the call is
   logged). Optionally exercise `sandbox/exec`, `fs/objects` (base64), `wallet/cards` on mocks.

✅ **Checkpoint:** a working Workstation, end-to-end, locally on mocks. Commit it to their repo
(`git add -A && git commit -m "baseline workstation" && git push`). Only now proceed.

## Phase 2 — The deployment path (what they need for a paid Workstation)
Move from local mocks to a hosted, metered deployment. State what each step *requires of the human*.

1. **Host it (Convex Cloud).** The user runs the interactive login + creates a project:
   ```bash
   npx convex login        # human, browser
   npx convex deploy       # creates/points at a cloud project → a public https://<name>.convex.site URL
   ```
2. **Connect real vendors** (human-only account steps, then wire env). Any primitive whose keys
   are absent simply stays on its mock — connect them one at a time:
   | Primitive | The human must… | Env vars (set via `bunx convex env set NAME val`) |
   |---|---|---|
   | Email (AgentMail) | create an inbox | `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID` |
   | Phone (AgentPhone) | get a number/agent; register A2P 10DLC for live SMS | `AGENTPHONE_API_KEY`, `AGENTPHONE_AGENT_ID` |
   | Wallet (AgentCard) | complete KYC, create a cardholder | `AGENTCARD_API_KEY`, `AGENTCARD_CARDHOLDER_ID` |
   | Computer (Freestyle) | get an API key | `FREESTYLE_API_KEY` |
   | Storage (R2/Archil) | create a bucket + CDN/disk | `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_ACCESS_KEY_SECRET`, `R2_BUCKET_NAME`, `CDN_BASE_URL`, `ARCHIL_DISK_ID` |
   Re-run the same calls from Phase 1 against the live URL to confirm each connected primitive.
3. **Make it paid.** Metering is per-op (costs in the registry; `metered:false` or `costCents:0` =
   free). For a paid deployment, set real `costCents`, then mint **scoped, funded** keys per client:
   ```bash
   bunx convex run accounts:mintKey '{"label":"client-acme","scopes":["phone:sendSms","email:send"],"creditsCents":50000}'
   ```
   - Scopes: `"*"`, `"<port>:*"`, or `"<port>:<method>"`; empty = full access; out-of-scope → 403.
   - Top up later: `accounts:grantCredits '{"accountId":"acc_…","amountCents":N}'`. Exhausted → 402.
   - Optional abuse cap: `WORKSTATION_RATE_LIMIT_PER_MIN`; 402 top-up link: `WORKSTATION_TOPUP_URL`.
4. **Smoke test live & hand off:** call with a client key against the cloud URL; confirm metered
   debit, `402` when out of credits, `403` out of scope. Commit + push config to their repo.

## Customizing — add a capability (vendor/vertical)
A new primitive `xyz` = one folder `modules/xyz/` (Zod schemas + ops + port interface + adapter +
mock + `server.ts`) and three one-line registrations. **Follow the recipe in `AGENTS.md`.** Never
edit `gateway.ts`/`invoke.ts`/`http.ts`.

## Guardrails
- Secrets live in Convex env vars — never in code or committed to the repo.
- Never log `pan`/`cvv`; never expose `accounts:grantCredits` on a caller-facing route.
- Regenerate the spec after contract changes: `bun scripts/gen-openapi.ts`.

## References
- `AGENTS.md` — add-a-capability recipe + import rules.
- `SPEC.md` — the normative protocol (primitives, gateway, metering, scopes, events).
