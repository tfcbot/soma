---
name: customize-workstation
description: Take a user from nothing to a deployed, paid Workstation. Phase 1 — clone the repo into a clean dedicated dir as their own private repo, run it locally on mocks, and prove a "hello world" call works end-to-end (no vendor accounts). Phase 2 — walk the deployment path: host on Convex Cloud, connect real vendors, set metering, and mint scoped funded keys. Phase 3 — turn on the Stripe rail in TEST mode, generate a real test payment link, and complete a full paid round-trip (signup → pay with a test card → key minted) with no webhook. Use when a user wants to set up, onboard, stand up, customize, or launch their own Workstation / agent backend.
compatibility: For an AI coding agent (e.g. Claude Code) on the user's machine. Requires git, bun, gh, and the Convex CLI. Live vendors and a hosted deploy need the user's own accounts/keys.
license: MIT
metadata:
  author: tfcbot
  project: workstation
---

# Set up a Workstation

Workstation lets you ship your service as a metered **API + CLI + MCP** — one typed contract, three
surfaces — that your clients' agents use and pay for headlessly. It ships five reference primitives
(phone, email, computer, storage) behind one gateway (per-key accounts, credits, rate
limits, scopes, an event ledger), but the real job is packaging *your* capabilities the same way.
This skill takes a user from nothing to a deployed, paid Workstation in three phases. **Get each phase green before starting the next.** Work in small, verified steps; confirm
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
   logged). Optionally exercise `sandbox/exec`, `fs/objects` (base64) on mocks.

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
   | Computer (Vercel Sandbox) | create a Vercel project + access token | `VERCEL_TEAM_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TOKEN` |
   Re-run the same calls from Phase 1 against the live URL to confirm each connected primitive.
3. **Make it paid.** Metering is per-op (costs in the registry; `metered:false` or `costCents:0` =
   free). For a paid deployment, set real `costCents`, then mint **scoped, funded** keys per client:
   ```bash
   bunx convex run accounts:mintKey '{"label":"client-acme","scopes":["phone:sendSms","email:send"],"creditsCents":50000}'
   ```
   - Scopes: `"*"`, `"<port>:*"`, or `"<port>:<method>"`; empty = full access; out-of-scope → 403.
   - Top up later: `accounts:grantCredits '{"accountId":"acc_…","amountCents":N}'`. Exhausted → 402.
   - **Self-serve payments (Stripe, shipped).** Setting `STRIPE_SECRET_KEY` turns on three public
     gateway ops — `POST /v1/signup` (mint a key from a paid Checkout), `POST /v1/topup` (refill an
     existing key), and their poll-confirm counterparts. `accounts:mintKey` stays operator-only;
     signup is the paid path to a first key. **Verify this end-to-end in Phase 3** — do not wire a
     webhook yet. Crediting/minting is idempotent (each session credits/mints at most once), so you
     can also test fulfillment with no Stripe at all:
     `bunx convex run claims:fulfill '{"claimToken":"claim_t1","creditsCents":20000}'` (after a
     `claims:storeClaim`; re-run → null) or `bunx convex run topups:creditOnce '{"sessionId":"cs_1","accountId":"acc_…","amountCents":5000}'`.
     Swap rails by replacing `convex/payments.ts`.
   - Optional abuse cap: `WORKSTATION_RATE_LIMIT_PER_MIN`; 402 top-up link: `WORKSTATION_TOPUP_URL`.
4. **Smoke test live & hand off:** call with a client key against the cloud URL; confirm metered
   debit, `402` when out of credits, `403` out of scope. Commit + push config to their repo.
5. **Publish docs (Mintlify).** The repo ships a `docs/` folder ready for Mintlify — `docs.json`,
   MDX guides, and an `openapi/spec.json` regenerated from the live contract by `bun run generate`.
   To publish: install the [Mintlify GitHub app](https://github.com/apps/mintlify) on the operator's
   repo, point it at the `docs/` folder, and set `api.baseUrl` in `docs/docs.json` to the live
   `https://<their-deploy>.convex.site`. Every time the contract changes, run `bun run generate`
   (writes both `spec/openapi/spec.json` and `docs/openapi/spec.json`), commit, and Mintlify
   redeploys. Local preview: `cd docs && npx mint dev`.

## Phase 3 — A real test payment link (Stripe TEST mode, no webhook)
Prove the paid path works against real Stripe **before** taking real money or wiring a webhook.
Everything here uses Stripe **test mode**, so no real charges occur.

1. **Get a test secret key.** In the [Stripe dashboard](https://dashboard.stripe.com/test/apikeys)
   with the **Test mode** toggle ON, copy the secret key (starts `sk_test_…`). Set it on the deploy:
   ```bash
   bunx convex env set STRIPE_SECRET_KEY sk_test_xxx
   ```
   Leave `STRIPE_WEBHOOK_SECRET` unset — the poll path needs no webhook.
2. **Generate the payment link.** Hit a public op against the live URL (no key needed for signup):
   ```bash
   curl -s -X POST https://<deploy>.convex.site/v1/signup -H "Content-Type: application/json" -d '{"amountCents":2000}'
   # → {"url":"https://checkout.stripe.com/c/pay/cs_test_…","claimToken":"claim_…"}
   ```
   (For an existing key, use `POST /v1/topup {amountCents}` instead — it returns a `url`.)
3. **Pay with a test card.** Open the `url` in a browser and pay with the Stripe test card:
   **`4242 4242 4242 4242`**, any future expiry, any CVC, any postal code. No real money moves.
4. **Complete the round-trip (poll — no webhook).** Claim the key the payment minted:
   ```bash
   curl -s -X POST https://<deploy>.convex.site/v1/signup/claim -H "Content-Type: application/json" -d '{"claimToken":"claim_…"}'
   # before paying → {"status":"pending"};  after paying → {"status":"completed","apiKey":"sk_workstation_…","creditsCents":2000}
   ```
   (Top-up equivalent: `POST /v1/topup/confirm {sessionId}`, where `sessionId` is the `cs_test_…`
   from the checkout URL.) Re-claiming a minted token → `already_claimed` (mint-once holds).
5. **Confirm it.** The returned `apiKey` is live: `curl …/v1/balance -H "Authorization: Bearer <key>"`
   shows the `2000` credits the payment bought. ✅ The full paid round-trip works.

**Optional — the webhook path (for production auto-fulfillment).** Install the
[Stripe CLI](https://docs.stripe.com/stripe-cli), then:
```bash
stripe listen --forward-to https://<deploy>.convex.site/webhooks/stripe   # prints a whsec_…
bunx convex env set STRIPE_WEBHOOK_SECRET whsec_…
stripe trigger checkout.session.completed                                  # fires a test event
```
The webhook and the poll both fulfill through the same idempotent seam, so they can never
double-credit. Go live by swapping the `sk_test_…` key for an `sk_live_…` one.

6. **Ship your front door (landing page).** The repo ships an empty-shell Next.js app at
   `apps/web/` with `/` (brandable hero), `/success` (post-payment confirmation), and `/cancel`.
   Deploy it to Vercel and point Stripe at it:
   ```bash
   cd apps/web && bun install               # workspace pickup
   bunx vercel link && bunx vercel --prod   # human: browser auth, then deploys
   bunx convex env set WORKSTATION_BASE_URL https://<their-domain>
   ```
   Now Stripe sends paid buyers to `<their-domain>/success?session=…` and the `402` `topupUrl`
   in error bodies points at `<their-domain>/?account=…`. Operator should swap the placeholder
   hero in `apps/web/src/app/page.tsx` for their actual brand and value prop (the README hero is
   the default scaffold). `WORKSTATION_BASE_URL` supersedes the prior
   `WORKSTATION_LANDING_URL` and `WORKSTATION_TOPUP_URL` (both still honored as fallbacks).

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
