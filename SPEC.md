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

### 2.1 None of this is new — and that's the point

The body/brain split is not a novel idea; it is **separation of concerns**, **stable
interfaces**, and **dependency inversion** — software-engineering principles that are decades
old. We are applying them to a place that currently ignores them: the agent itself.

The relevant principle is dependency inversion. High-level policy should not depend on
low-level detail; both should depend on a **stable abstraction**:

- The **agent (brain)** is high-churn and volatile. Models are replaced on a monthly cadence;
  the agent you build on today is obsolete within a release or two.
- The **operating layer (body)** is the stable abstraction. It changes additively and on its
  own schedule (§12), not the model vendors'.

So we invert the dependency: **the volatile agent depends on the durable contract, never the
reverse.** That is the entire reason the split is worth drawing.

### 2.2 Why "raw API + skills" rots, and a durable backend doesn't

The prevailing pattern today — Claude Code, Codex, OpenClaw, et al. driving **raw vendor APIs
plus skills/prompts** — produces *cheap, ephemeral software*. It is fast to stand up, and that
is genuinely useful. But the capability lives **inside the agent layer**: in prompts, skills,
and glue the agent re-derives at runtime. That has two compounding costs:

1. **It's expensive to keep rewriting.** Logic encoded in prompts/skills gets re-implemented,
   re-explained, and re-run constantly — you **blow tokens** re-establishing the same plumbing
   every session instead of calling a stable endpoint once. Ephemeral software has to be
   re-summoned; durable software is just *there*.
2. **Migration is brutal when the agent goes out of date.** The instant a better agent ships —
   and one always does — everything baked into the old agent layer (its skills, its prompt
   scaffolding, its vendor glue) has to be ported. The investment was made in the **disposable**
   layer, so it gets thrown away with it.

A durable backend flips this. Capability lives in the **contract**, not in any one agent. When
a new agent appears, you don't migrate — you **re-point**:

```
        ephemeral (raw API + skills)              durable (operating layer)
        ────────────────────────────             ──────────────────────────
  2025   Claude Code ─┐                           Claude Code ─┐
                       ├─ glue lives IN the                     │
  2026   Codex ───────┤   agent; replace the       Codex ──────┤
                       │   agent → rewrite          OpenClaw ───┼──► Personal API
  2027   OpenClaw ────┤   everything                            │    (stays put;
                       │                            future ─────┘     glue lives HERE)
  2028   new model ───┘                            model
         each switch = re-implement + re-spend     each switch = change one endpoint URL
```

Point Claude at it today, Codex tomorrow, OpenClaw or some not-yet-shipped supercomputer-class
agent the day after — **the backend doesn't move.** The contract, the wallet, the storage
history, the `/todo` loop, the procurement glue all persist across agent generations. You stop
re-buying the same capability every time the frontier moves, and agent obsolescence becomes a
URL change instead of a rewrite.

This is also the honest version of "no lock-in": because we operate no agents (§3) and expose
only a contract, the principal is never married to a model vendor *or* to us — the same open
interface runs on a self-hosted core (§14).

### 2.3 The durable layer is two-faced — and deterministic in the middle

So far the durable layer has been described from the **consumer side**: the client's agent
points at it. But the contract has a second face. On the *other* side, an agent — supervised by
a human operator — **builds and maintains the layer itself.** The full picture is symmetric,
with the deterministic contract in the center:

```
   CONSUMER SIDE                  DURABLE LAYER                MAINTAINER SIDE
   (the principal)                (deterministic)              (the provider)

   customer  ⇄  agent  ──────►  [ serverless API ]  ◄──────  infra  ◄──  agent  ⇄  operator
   (client²)   (brain)             the contract                          (brain)    (human)
               consumes it      stable · deterministic ·               builds, maintains,
                                    serverless                          and self-improves it
```

Two agents, one contract between them. The principal's agent **drives** the layer; the
operator's agent **owns making the updates** to it — extending primitives (§12), hardening
adapters, re-provisioning the VM — under a human operator's oversight. The maintenance that was
a permanent tax in the VPS world (§5.2) is now *itself* done by an agent, with the human as
supervisor rather than keyboard operator.

> Note the double meaning of **client**. It is the *client* in the computer-science sense — the
> calling software, the agent that consumes the API — **and** the *client* in the customer
> sense — the human paying for the deliverable. The contract serves both at once, which is why
> a clean one matters so much.

**Why a deterministic, serverless middle solves a whole class of bugs.** LLM agents are
**stochastic** — run the same prompt twice, get two behaviors. If business-critical logic
(state transitions, budget ceilings, procurement gating, billing) lives *inside* an agent, the
whole system inherits that non-determinism: it can't be reliably tested, reproduced, or
trusted, and bugs hide in the variance. Moving that logic into a **deterministic serverless
layer** — pure functions and an explicit state machine (the `/todo` lifecycle, §10) — makes it
reproducible, testable, and reliable. The agents become *orchestrators of* a deterministic
core, never the core itself. The deterministic middle is the **firebreak** that absorbs the
non-determinism on both ends and hands the customer a smooth, predictable experience.

This is the same hexagonal discipline as §5.4, read end to end: a **pure deterministic core**
(§13 `core/`) with **stochastic agents at both edges** as driving adapters. The second-order
move — a maintainer-side agent that *self-improves the durable layer* — is only safe *because*
the core is deterministic and the human operator supervises: improvements are diffs against a
testable contract, not unobservable mutations to a server that rots.

### 2.4 Granular cost control: token spend and tooling spend

The same split that buys determinism also buys **fine-grained cost control** — on both axes
that actually cost money.

**Token spend (the agent axis).** Tokens are the expensive, stochastic resource. When work
lives inside the agent loop, *everything* is paid for in tokens — including the deterministic
plumbing the agent re-derives every session (§2.2). Pushing that work behind the contract
turns it into **cheap, fixed-cost API calls**, and reserves the model for what only a model can
do — judgment and orchestration. Concretely, that unlocks:

- **Right-sizing the brain.** Because the contract carries the complexity, a *cheaper* agent
  can drive it. You don't need a frontier model to call `POST /todo` and read a webhook — match
  the model tier to the task instead of paying top-of-stack for plumbing.
- **No re-spend on repeat work.** Deterministic functions are cacheable and memoizable;
  stochastic agent steps are not. Work done once behind the contract is *there*, not
  re-summoned at token cost on the next run.
- **Spend where the leverage is.** Token budget concentrates on the few genuinely hard
  reasoning steps, not on re-establishing the same scaffolding turn after turn.

**Tooling spend (the wallet axis).** Every external cost already routes through the wallet
(§11). Because it routes through *the contract* rather than an opaque agent, each charge is a
**metered event** attributable down to the individual `/todo` and primitive call — not a
monthly lump. This yields per-todo, per-primitive, per-principal cost lines for free, and lets
budget ceilings be enforced **deterministically in code** (a hard stop, §11) rather than by
asking the agent to please stay under budget.

```
  WHERE THE COST LANDS            opaque agent loop          behind the contract
  ────────────────────           ─────────────────          ───────────────────
  deterministic plumbing         paid in tokens, re-run      fixed-cost API call, cacheable
  model reasoning                paid in tokens              paid in tokens (unchanged — fine)
  external tooling               opaque monthly invoice      metered per todo / primitive
  budget ceiling                 "agent, stay under $X"      hard stop enforced in code
  attribution granularity        one bill                    per-call line items
```

Net: the deterministic layer doesn't just remove a class of bugs (§2.3) — it makes both kinds
of spend **observable and optimizable at the call level**, which is what keeps the unit
economics (§11, §15) honest as volume grows.

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

## 5. The abstraction-layer argument: from VPS to a personal API

This is the clearest statement of why the thing exists. The level-up is precise: we move the
client **up one rung on the abstraction ladder** — from owning a *server* to owning a
*contract*.

> **Old paradigm:** an agency helps the client "set up a VPS." This is the wrong abstraction
> layer for the client. The client doesn't know what a VPS is and has no capacity to manage
> one. *Nobody* can manage a VPS unless managing it is their full-time job — because it is one.

> **This paradigm:** the client never touches a VPS. The client owns a **personal API** — a
> headless assistant their agent calls through their own agent. They do not need to know
> anything about what's running underneath. The computer and storage still exist — but they
> are abstracted behind the contract and made **observable to the provider** for QA.

The plumbing didn't disappear; it moved to the layer that can actually operate it.

### 5.1 The abstraction ladder

```
                        owns / manages         degrades over time?     who can run it
  ┌────────────────────────────────────────────────────────────────────────────────────┐
  │ Rung 0  Raw machine     the client runs a VPS        YES — entropy    only a full-time
  │         (VPS)           (OS, deps, security,         is the default     ops person
  │                          cron, disk, drift)
  │
  │ Rung 1  Managed box     someone else runs the VPS    YES — still a     a provider, but the
  │         (managed VPS)   but it's still a *server*     server, just     client still owns a
  │                          handed to the client          hidden            server-shaped thing
  │
  │ Rung 2  Personal API   the client owns a *contract*  NO — a contract   the client's AGENT,
  │  ◄── WE ARE HERE         their agent calls;            is versioned,     with zero ops
  │                          plumbing is the provider's     not maintained
  │                          problem behind the contract
  └────────────────────────────────────────────────────────────────────────────────────┘
```

The whole product is the jump from Rung 1 to Rung 2. A managed VPS is still a server the
client nominally owns; a personal API is a **stable surface** the client's agent talks to and
nothing else.

### 5.2 Why a contract beats a server: entropy

A VPS is a **stateful, mutable system** — and every stateful mutable system degrades. Packages
drift, certs expire, disks fill, security patches lag, someone SSHes in and changes something
nobody documents. Maintenance isn't a one-time setup cost; it's a *permanent tax* that only
goes up. That tax is exactly why "running it" has to be someone's full-time job.

An API is a **contract**, not a running thing the client holds. Its properties are the opposite
of a server's:

| | VPS (a server) | Personal API (a contract) |
|---|---|---|
| Default trajectory | **degrades** — entropy, drift, rot | **stable** — the contract holds until versioned |
| Maintenance | a permanent tax on the *owner* | the *provider's* problem, behind the interface |
| Change management | mutate in place, hope nothing breaks | additive endpoints + explicit versioning (§12) |
| What the client reasons about | OS, deps, disk, security, uptime | request → response, and a webhook |
| Failure surface | the whole box | one endpoint, one schema |
| Observability | "can you screen-share?" | the provider peers into the sandbox (§7) |

The mutable, rotting part still exists — the VM, the disk, the installed toolchain — but it is
now **behind** the contract, on the provider's side, where it can be re-provisioned from clean
state at will (the VM is cattle, not a pet). The client never owns the part that degrades.

### 5.3 The pattern we're adopting: BFF → Backend-for-Agent

This is the **Backend-for-Frontend (BFF)** pattern from web development, reframed for agents.

In web dev, a BFF sits between *one* frontend and *many* messy backend services. It exists so
the frontend talks to a single surface shaped exactly to how *that* frontend consumes things —
instead of the frontend orchestrating a dozen APIs with a dozen auth schemes itself.

Swap "frontend" for "agent" and you have this product:

```
  WEB BFF                                  THIS (Backend-for-Agent)
  ───────                                  ────────────────────────
  Frontend                                 Agent  (the brain, BYO)
     │  one tuned surface                     │  one opinionated API
     ▼                                        ▼
  ┌─────────┐                              ┌──────────────────────────┐
  │  BFF    │  shapes & aggregates         │  Personal API (the body) │  shapes 6 vendors into
  └─────────┘                              └──────────────────────────┘  one agent-shaped contract
     │                                        │
     ├─► auth service                         ├─► phone   (Twilio)
     ├─► orders service                       ├─► email   (AgentMail)
     ├─► catalog service                      ├─► wallet  (Stripe Issuing)
     └─► payments service                     ├─► computer(Freestyle VM)
                                              ├─► storage (Archil / S3)
                                              └─► todo    (derived state)
```

The agent is the frontend. The personal API is its **Backend-for-Agent**: it absorbs six
vendors — six auth schemes, six SDKs, six failure modes — and presents one contract tuned to
how an agent actually drives work. The agent never orchestrates vendors directly, the same way
a good web frontend never orchestrates microservices directly.

### 5.4 Event-driven + hexagonal: how the contract holds

Two architectural commitments keep the contract stable while the messy parts churn behind it.

- **Hexagonal (ports & adapters).** The contract is the *port*; each vendor is a swappable
  *adapter* (§13). Swapping Twilio for another phone vendor, or re-provisioning the VM, changes
  an adapter — never the contract the agent depends on. The thing that degrades (the adapter)
  is isolated from the thing the client owns (the port).
- **Event-driven.** The agent doesn't poll-and-wait. Work is a small event loop over `/todo`
  (§10): the agent **pushes** intent (`POST /todo`) and the system **emits events** as state
  changes (`requested → … → delivered`), which fan out as webhooks to the principal's channels.
  Pull (`GET /todo`) and push (state-change → webhook) are the *only* two interaction patterns.

```
  REQUEST / RESPONSE (pull)            EVENT-DRIVEN (push)
  ────────────────────────            ───────────────────
  agent ──► GET  /todo ──► state       state change ──► event ──► webhook ──► principal's
  agent ──► POST /todo ──► ack           (delivered)                            phone / email
```

Together: the **hexagon** keeps the contract from breaking when vendors change; the
**event loop** keeps the agent from babysitting the work. Both are in service of the one
promise — the client owns a contract that doesn't degrade, not a server that does.

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
**Compute and storage are split into two planes — different vendors, different jobs:**

- **Sandbox = Freestyle** (control plane). A full-Linux VM with the repo mounted: install
  ffmpeg, no 5-minute cap, real CPU. This is where work runs. Freestyle uniquely bundles
  compute *and* a versioned workspace (git, branches), so versioning lives here: git runs
  **in the sandbox** against the mounted workspace (`core/services/versioning.ts`), `wip` →
  `delivered`. Archil's own serverless exec is deliberately **not** used for compute — its
  5-min cap / missing ffmpeg / ephemeral container make it the wrong tool.
- **FileSystem = Archil + R2** (data plane). The Archil disk is **backed by an R2 bucket**:
  write an object to the bucket and it appears on the disk; a **public-prefixed** object is
  served by a custom domain — the personal CDN, reusing VidJutsu's R2 pattern
  (`convex/actions/storage.ts`). `publicUrl()` returns `CDN_BASE/key`. No S3, no Vercel Blob.
- **Todo store = Convex DB** behind `TodoPort` (a `todos` table; VidJutsu schema conventions).
  Convex's other capabilities (scheduler, vector search, durable functions) are **not** exposed
  as primitives — scheduling and memory are the client agent's job, not the body's (§2).
- The **read-only / git boundary is optional** here — single-node has no clients to wall off,
  so git-in-the-sandbox is enough; promote to a Freestyle-Git `VersionPort` only at multi-tenant.
- **Provider portability is a deferred option, not a dependency.** The `SandboxPort` is the
  seam: Freestyle is the default adapter; a ComputeSDK adapter (E2B / Modal / Vercel) can be
  added later if portability is ever needed. We don't build that indirection now.

The orchestration ties the planes (`core/services/assistant.ts → deliver`): run work in the
**Sandbox** → pull the artifact out → persist to the public **FileSystem** (→ CDN url) →
advance the **Todo** to `delivered` → notify by **Email**.

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
