# The Programmable Assistant Protocol

> Working codename: **Soma** (Greek, "body") — a programmable body for an agent's brain.
> The name is a placeholder; the formula below is the point.

Status: draft / organizing thoughts. Vendor-neutral and open-source by intent. Not tied to
any one product — a hosted creative agency (e.g. on VidJutsu) is expected to be the first
*reference implementation*, not the spec itself.

---

## 1. Thesis

There is a small, fixed set of primitives that give an agent a **complete loop** — everything
it needs to pursue a goal on the internet on someone's behalf:

| Primitive | What it gives the agent |
|---|---|
| **Phone** | a way to be reached and to talk/text (voice, SMS, iMessage) |
| **Email** | a way to correspond, sign up for services, receive receipts |
| **Wallet** | a way to pay for whatever a job needs |
| **Computer** | a way to think-and-act: run code, unrestricted, sandboxed |
| **Storage** | a way to remember: hold state, versions, and deliverables |
| **Todo** | a way to track and coordinate the work itself |

That bundle is the whole primitive. With it, an agent can be briefed, do the work, pay for
tools, keep its outputs, and report back — a closed loop — without ever borrowing the
principal's own card, phone, email, or machine.

Three commitments define what this is:

1. **We provide primitives, not agents.** We do **not** operate agents on our end. We expose
   these primitives through one opinionated API so that *someone else's* agent has a complete
   loop. The platform is headless.
2. **We are a thin wrapper around vendors.** Each primitive is a small, auditable wrapper
   over a best-in-class vendor. More primitives can be added over time the same way.
3. **The base is open source.** Anyone can self-host and customize it to build their own
   programmable assistant. A hosted provider is just one way to consume it.

## 2. The core split: Body vs Brain

The single most important idea in this spec:

| | What it is | Who owns it | Open or BYO |
|---|---|---|---|
| **Assistant** (the body) | the six primitives above | provided/hosted; headless | **open primitive** |
| **Agent** (the brain) | the LLM loop, reasoning, data connections | the **principal** (or the agency that maintains it) | **bring your own** |

We open-source **the body**. You bring **the brain**.

The principal already has an agent — Claude Code, Claude for cowork, whatever they live in.
We do not ask them to adopt ours or reconfigure theirs. We hand their agent an opinionated
API onto a body it can drive. Most products try to *be* the agent. This one refuses to. It is
the body the agent borrows.

## 3. Who operates what (this matters — read it twice)

Three distinct roles. Keeping them separate is what makes the model honest:

- **The Platform** (Soma — open source / hosted infra). Exposes the six primitives as one
  API. **Operates no agents.** A thin, auditable wrapper around vendors. Headless.
- **The Agent** (the brain). Plugs into the primitives and runs the loop. Owned by the
  principal, or — in the agency model — maintained by the provider. The platform never runs
  it.
- **The Provider / Agency** (the service business). Owns **QA, oversight, and maintenance** of
  the agent and the deliverable quality. Does **not** babysit — full sandbox visibility (§7)
  makes oversight cheap. Takes the operational burden off the principal.

Two consumption modes fall out of this:

- **Self-host:** the principal *is* the provider — their own agent drives the primitives they
  host themselves.
- **Agency (hosted):** the provider maintains the agent + does QA; the principal only briefs
  and receives. (This is the worked example in [SCENARIOS.md](./SCENARIOS.md).)

## 4. The target user

Not a technical buyer. A **high-level executive who lives in Claude** (Claude Code, cowork)
and wants to:

- **interface by phone number or email** — brief the assistant and talk to it like a person,
- have **their agent do all the low-level computer/storage work**, unrestricted,
- **own none of the plumbing** — no VPS, no API keys, no vendor accounts, not even their own
  card/phone/email/drive plugged in.

They are fine with the agent having unrestricted compute *because it is sandboxed* — see §7.
All they actually care about is the **deliverable**.

## 5. The abstraction-layer argument (vs. the VPS)

This is the clearest statement of why the thing exists.

> **Old paradigm:** an agency helps the client "set up a VPS." This is the wrong abstraction
> layer for the client. The client doesn't know what a VPS is and has no capacity to manage
> one. *Nobody* can manage a VPS unless managing it is their full-time job — because it is one.

> **This paradigm:** the client never touches a VPS. The client interfaces with a **headless
> assistant** through their own agent and does not need to know anything about what's running.
> The computer and storage still exist — but they are abstracted away from the client and made
> **observable to the provider** for QA and troubleshooting.

The plumbing didn't disappear; it moved to the layer that can actually operate it.

## 6. Computer + storage: two planes

The "computer" and "storage" primitives split into two planes, and keeping them clean is what
keeps the system honest:

- **Control plane (version + exec)** — a per-assistant git repo plus a VM that mounts it. Git
  branches are checkpoints: `wip` for work in progress, `delivered` for shipped state. The VM
  is a full Linux box (install anything — ffmpeg, etc.), unrestricted, does the work, commits
  to `wip`, pushes to `delivered` to ship. Reference adapter: Freestyle.
- **Data plane (blobs)** — heavy artifacts (video, images) live in object storage, referenced
  by *pointer* from git. Never put large binaries in git. Reference adapter: S3 (or Archil for
  a POSIX mount).

Git versions the **recipe and the state**; object storage holds the **bytes**. Why git as the
version layer: read-only is enforced server-side (clone-only identity), delivery
notifications are free (push to `delivered` → webhook), and "what changed?" is `git diff`.

## 7. Unrestricted, but sandboxed — and that's the deal

The agent's computer is **unrestricted** (it can run anything) precisely because it is
**sandboxed** (it runs in an isolated VM, on a wallet with a hard ceiling, with no access to
the principal's real accounts). The principal can be comfortable handing over a complete loop
because the blast radius is contained.

And because it's a sandbox the provider controls, the provider can **peer in** — the computer,
the storage, the conversation history, the API calls are all visible. Troubleshooting is
"look at the sandbox," not "ask the client to screen-share their VPS." This is what makes the
QA-and-maintenance burden cheap enough to take off the client's hands.

## 8. The service model — an opinionated API for the principal's agent

The product is not software the principal logs into; it is **work delivered into a body the
principal's agent can observe and direct.**

```
Principal's Agent  ──(opinionated API)──►  Platform (primitives)
   (brain, owned                              ▲
    by the principal)                         │ provider does QA + maintenance,
        ▲                                      │ peers into the sandbox
        └──── surfaces deliverables, progress, issues ────┘
```

Rules:

1. **The principal must have an agent.** We plug into it; we don't replace it.
2. **The principal owns their data and connections.** We never take over their agent.
3. **We expose an opinionated API, not a configuration burden.** Adopting us is pointing
   their agent at one endpoint, not re-architecting it.
4. **The primitives are deployed on their behalf**, over whichever vendors we choose. The
   principal manages no vendors; they get faculties.

It is, in effect, **SaaS with no dashboard and no account to manage** — the provider just
hands new primitives to the client's agent.

## 9. Agent Success Manager (ASM)

The reframe of the front-service layer:

> Instead of a **Customer Success Manager**, the provider runs an **Agent Success Manager** —
> a narrow interface layer whose only job is to surface deliverables, progress, and issues
> to the principal's agent.

The ASM is front-of-house only: report status (from `/todo`), deliver finished assets, raise
issues that need input, capture new requests/revisions. Production, QA, and procurement happen
behind it. The principal's only obligations are **approve budgets** and **load the wallet**.

## 10. The `/todo` primitive

**Zero shipped UI.** `/todo` is the queryable projection of all work state — anyone can build
a board on it; the principal's agent queries it directly.

```json
{
  "id": "td_…",
  "title": "Ad 04 — 'can't fall asleep' hook",
  "state": "in_production",
  "owner": "principal_…",
  "brief": "9:16, brand kit, hook on insomnia",
  "channel_origin": "sms",
  "budget": { "authorized": 200, "spent": 47.50, "currency": "USD" },
  "artifacts": ["s3://…/ad-04-v3.mp4"],     // populated at `delivered`
  "ref": { "branch": "delivered", "commit": "…" },
  "history": [ { "state": "requested", "ts": "…", "actor": "principal" } ]
}
```

Lifecycle (a fixed, small state machine — not a workflow engine):

```
requested → accepted → in_production → qa → delivered → (approved | revise)
```

Access split (this is also the read-only boundary):

- **Principal side:** `GET /todo`, `GET /todo/:id` (read), `POST /todo` (the one write:
  intake), `POST /todo/:id/comment` (a revise note).
- **Provider side:** drives state transitions, attaches artifacts, records spend.

Pull (agent queries status) and push (state change → webhook → the principal's channel) are
the only two interaction patterns.

## 11. The budget / wallet envelope

Autonomous spend is the highest-risk primitive and is a first-class object.

- The principal authorizes a **budget envelope** — scope + ceiling.
- The wallet is **prepaid** — a hard ceiling; the agent can only spend what's loaded.
- **One cardholder per principal** → every external cost is itemized per principal → clean
  cost-of-goods and markup.
- Start with a **human approval gate on every charge**; automate within the envelope once
  trusted.
- Procurement uses the **email** primitive for signup/verification and the **wallet** for
  payment; receipts land in an ops inbox kept invisible to the principal-facing read interface.

## 12. Extensibility — more primitives over time

The six are the starting set, not the ceiling. Because each primitive is a thin wrapper over a
vendor behind a stable interface, **new primitives are additive**:

- A provider (or a self-hoster) can **add an endpoint** — e.g. a `publish` primitive that
  posts approved assets to Meta/TikTok, an `analytics` primitive that pulls performance, a
  `calendar` primitive, a `voice-clone` primitive — without touching the existing ones.
- Open source means anyone can fork and add the primitives their niche needs, then run their
  own programmable assistant on top.

The protocol's job is to keep the primitive interface and the `/todo` loop stable so new
primitives plug in cleanly.

## 13. Ports & adapters

```
                 ┌──────────────────────────────────────────────┐
 Principal's     │              Opinionated API                  │
 Agent ─────────►│   (the only surface the principal's agent     │
 (BYO brain)     │    touches; fronts every primitive below)     │
                 └──┬─────┬─────┬──────┬───────────┬─────────┬────┘
                  Phone  Email Wallet Computer   Storage    Todo   (+ future)
                    │     │     │       │           │         │
              AgentPhone Agent  Agent  Freestyle  S3 /     (derived from
                        Mail   Card    VM         Archil    git + intake)
```

Adapters are swappable: Phone→Twilio, Email→Postmark/SendGrid, Wallet→Stripe Issuing/Lithic,
Computer→Archil exec/E2B, Storage→Archil/S3.

## 14. Open vs. hosted

- **Open:** the protocol — the six primitives, the `/todo` loop + lifecycle, the body/brain
  split, the primitive interfaces, the budget envelope, the read-only boundary, extensibility.
- **Hosted (reference implementation):** a provider wiring real adapters and running an agency
  (team + ASM) on top. The open spec is the credibility and moat-by-adoption; the hosted
  service is the proof.

## 15. Open questions / risks

- Read-only grant syntax on the version layer — confirm the clone-only identity call.
- Compute limits + pricing (CPU/mem/disk, idle suspend, ffmpeg install) — affects unit
  economics; confirm before pricing the offer.
- Wallet authorization + KYC/ToS — autonomous signup may violate some vendors' terms; gate
  behind explicit authorization and per-vendor judgment.
- Channel media limits — embedding video in SMS/iMessage vs. delivering by email attachment.
- Offer pricing — a $99 entry can't fund a human service team; treat $99 as the subscription
  to the *body + interface* and bill production as budgeted engagements through the wallet.

## 16. Reference deployment: single-node on Convex

The first real build is **personal, single-node** — one user, no clients. That collapses most
of the hosted-version cost, and **Convex** is the host: a trivial signup that bundles the
database, public HTTP endpoints, scheduled functions, and secret storage in one service.
(Vercel is a frontend host; it would make you bolt a DB and cron onto the side.)

How the protocol maps onto Convex:

- **Convex is the composition root + the driving adapter**, not a port. Its HTTP actions front
  the six primitives; it wires each port to a real-or-mock adapter at startup.
- **Single user, no tenant model.** All vendor keys live in **Convex env vars**
  (`npx convex env set …`), read with a fail-fast helper. There is no key vault and no
  custodian-trust problem because the only customer is you.
- **Endpoints are API-key-gated, not network-private.** A Convex HTTP action has a public URL;
  you protect it with a Bearer-key check that 401s anything without the key — the same pattern
  already running in VidJutsu (`convex/payments.ts` → `getBearerToken` / `checkAuth`),
  simplified here to a single `GATEWAY_API_KEY` compare.
- **Storage = Archil** (no S3, no Vercel Blob). Caveat: Convex can't FUSE-mount Archil, so
  file ops route either through the **Freestyle VM** (full Linux, mounts Archil) or Archil's
  **TypeScript SDK** for small/metadata ops.
- **Computer = Freestyle VM** — unrestricted Linux with ffmpeg, no 5-minute cap; Convex
  orchestrates it over HTTP.
- **Todo store = Convex DB** behind `TodoPort` (a `todos` table; VidJutsu schema conventions).
- The **read-only / git boundary is optional** here — with no clients to wall off,
  `VersionPort`/git becomes a convenience (history/undo), not a requirement.

Ops notes: Convex 1.31+ needs **Node 22**; run `npx convex dev --until-success` after any
schema/action change to regenerate types.

This is the **hosted reference implementation** of §14, sized for one node. The same
ports/adapters core drops into a localhost CLI later by swapping only the composition root.

---

## Glossary

- **Assistant** — the body: the six primitives, deployed and operated headlessly.
- **Agent** — the brain: the LLM loop + reasoning + data connections; bring your own.
- **Principal** — the customer; owns their agent and data.
- **Provider / Agency** — the service business; owns QA + maintenance, peers into the sandbox.
- **Platform (Soma)** — the open-source/hosted infra that exposes the primitives; runs no agents.
- **ASM (Agent Success Manager)** — the provider's narrow front-of-house interface.
- **Primitive / Port** — one of the six (extensible), defined as a swappable interface.
- **Adapter** — a concrete vendor behind a primitive.
- **Control plane / Data plane** — version+exec (git/VM) vs. blob storage.
