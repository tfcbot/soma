# Thesis — Workstation

The reasoning and philosophy behind the protocol. This doc explains *why*; the normative,
implement-anywhere contract lives in [SPEC.md](./SPEC.md), and a concrete walkthrough in
[SCENARIOS.md](./SCENARIOS.md).

---

## 1. The idea: a body for an agent's brain

There is a small, fixed set of primitives that turn a language model into something that can
operate in the world on someone's behalf: a **phone**, an **email**, a **wallet**, a
**computer**, and **storage**. Bundle those behind a metered gateway and an agent has a
*complete loop* — it can be briefed, do the work, pay for tools, keep its outputs, and report
back — without ever borrowing the principal's own card, phone, email, or machine. Tracking and
coordinating the work is the agent brain's job, not the body's.

| | What it is | Who owns it |
|---|---|---|
| **Workstation** (the body) | the primitives | provided/hosted; headless |
| **Agent** (the brain) | the LLM loop, reasoning, data connections | the principal (bring your own) |

We open-source **the body**. You bring **the brain**. The principal already has an agent —
Claude Code, Claude for cowork, whatever they live in. We don't ask them to adopt ours or
reconfigure theirs; we hand their agent one opinionated API onto a body it can drive. Most
products try to *be* the agent. This one refuses to. It is the body the agent borrows.

## 2. None of this is new — and that's the point

The body/brain split is just **separation of concerns**, **stable interfaces**, and
**dependency inversion** — decades-old engineering principles, applied to a place that
currently ignores them: the agent itself.

Dependency inversion says high-level policy should not depend on low-level detail; both should
depend on a **stable abstraction**:

- The **agent (brain)** is high-churn and volatile. Models are replaced on a monthly cadence;
  the agent you build on today is obsolete within a release or two.
- The **operating layer (body)** is the stable abstraction. It changes additively and on its
  own schedule, not the model vendors'.

So we invert the dependency: **the volatile agent depends on the durable contract, never the
reverse.** That is the entire reason the split is worth drawing.

## 3. Why "raw API + skills" rots, and a durable backend doesn't

The prevailing pattern today — Claude Code, Codex, OpenClaw et al. driving **raw vendor APIs
plus skills/prompts** — produces *cheap, ephemeral software*. Fast to stand up, genuinely
useful. But the capability lives **inside the agent layer**, in prompts and glue the agent
re-derives at runtime. Two compounding costs:

1. **It's expensive to keep rewriting.** Logic in prompts/skills gets re-implemented and re-run
   constantly — you **blow tokens** re-establishing the same plumbing every session instead of
   calling a stable endpoint once. Ephemeral software has to be re-summoned; durable software is
   just *there*.
2. **Migration is brutal when the agent goes out of date.** The instant a better agent ships,
   everything baked into the old agent layer has to be ported. The investment was in the
   **disposable** layer, so it's thrown away with it.

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

The contract, the wallet, the storage history, the `/todo` loop, the procurement glue all
persist across agent generations. Agent obsolescence becomes a URL change instead of a rewrite.
This is also the honest version of "no lock-in": because we operate no agents and expose only a
contract, the principal is never married to a model vendor *or* to us — the same open interface
runs on a self-hosted core.

## 4. The durable layer is two-faced — and deterministic in the middle

The contract has two faces. The consumer side: the client's agent points at it. The maintainer
side: an agent, supervised by a human operator, **builds and maintains the layer itself.**

```
   CONSUMER SIDE                  DURABLE LAYER                MAINTAINER SIDE
   (the principal)                (deterministic)              (the provider)

   customer  ⇄  agent  ──────►  [ serverless API ]  ◄──────  infra  ◄──  agent  ⇄  operator
   (client²)   (brain)             the contract                          (brain)    (human)
```

Two agents, one contract between them. The principal's agent **drives** the layer; the
operator's agent **owns making the updates** — extending primitives, hardening adapters,
re-provisioning the VM — under human oversight. The maintenance that was a permanent tax in the
VPS world is now *itself* done by an agent, with the human as supervisor rather than keyboard
operator.

> Note the double meaning of **client**: the *client* in the computer-science sense (the calling
> agent) **and** the *client* in the customer sense (the human paying). The contract serves both
> at once, which is why a clean one matters.

**Why a deterministic, serverless middle solves a class of bugs.** LLM agents are
**stochastic**. If business-critical logic (state transitions, budget ceilings, billing) lives
*inside* an agent, the whole system inherits that non-determinism — it can't be reliably tested,
reproduced, or trusted. Moving that logic into a **deterministic serverless layer** (pure
functions + an explicit state machine, the `/todo` lifecycle) makes it reproducible and
testable. The agents become *orchestrators of* a deterministic core, never the core itself. The
deterministic middle is the **firebreak** that absorbs non-determinism on both ends.

## 5. Granular cost control: token spend and tooling spend

The same split that buys determinism buys **fine-grained cost control** on both axes that cost
money.

**Token spend (agent axis).** When work lives in the agent loop, *everything* is paid in tokens
— including deterministic plumbing the agent re-derives each session. Pushing that behind the
contract turns it into cheap fixed-cost API calls, and reserves the model for judgment. That
unlocks: **right-sizing the brain** (a cheaper agent can call `POST /todo`), **no re-spend on
repeat work** (deterministic functions are cacheable), and **spend where the leverage is**.

**Tooling spend (wallet axis).** Every external cost routes through the wallet — and because it
routes through *the contract*, each charge is a **metered event** attributable to a specific
`/todo` and primitive call, not a monthly lump. Budget ceilings are enforced **deterministically
in code** (a hard stop) rather than by asking the agent to stay under budget.

```
WHERE THE COST LANDS            opaque agent loop          behind the contract
────────────────────           ─────────────────          ───────────────────
deterministic plumbing         paid in tokens, re-run      fixed-cost API call, cacheable
model reasoning                paid in tokens              paid in tokens (unchanged — fine)
external tooling               opaque monthly invoice      metered per todo / primitive
budget ceiling                 "agent, stay under $X"      hard stop enforced in code
attribution granularity        one bill                    per-call line items
```

## 6. The abstraction ladder: from VPS to a personal API

We move the client **up one rung** — from owning a *server* to owning a *contract*.

```
                      owns / manages         degrades?        who can run it
  Rung 0  VPS         the client runs it     YES — entropy    only a full-time ops person
          (raw)       (OS, deps, drift)      is the default
  Rung 1  Managed     someone else runs it   YES — still a    a provider, but the client
          VPS         but it's a *server*    server           still owns a server-shaped thing
  Rung 2  Personal    the client owns a      NO — a contract  the client's AGENT, zero ops
   ◄ HERE  API        *contract* their         is versioned,
                      agent calls               not maintained
```

**Why a contract beats a server: entropy.** A VPS is a stateful, mutable system, and every such
system degrades — packages drift, certs expire, someone SSHes in and changes something
undocumented. Maintenance is a *permanent tax* that only goes up. An API is a **contract**, not
a running thing the client holds:

| | VPS (a server) | Personal API (a contract) |
|---|---|---|
| Default trajectory | **degrades** | **stable** until versioned |
| Maintenance | a permanent tax on the *owner* | the *provider's* problem, behind the interface |
| Change management | mutate in place, hope | additive endpoints + explicit versioning |
| What the client reasons about | OS, deps, disk, uptime | request → response, and a webhook |
| Observability | "can you screen-share?" | the provider peers into the sandbox |

The mutable, rotting part still exists — the VM, the disk — but it's now **behind** the
contract, on the provider's side, re-provisioned from clean state at will (the VM is cattle, not
a pet). The client never owns the part that degrades.

## 7. The pattern: Backend-for-Frontend → Backend-for-Agent

This is the **Backend-for-Frontend (BFF)** pattern, reframed for agents. A BFF sits between one
frontend and many messy backend services, presenting a single surface shaped to how *that*
frontend consumes things. Swap "frontend" for "agent":

```
  WEB BFF                                  THIS (Backend-for-Agent)
  Frontend                                 Agent  (the brain, BYO)
     │  one tuned surface                     │  one opinionated API
     ▼                                        ▼
  ┌─────────┐                              ┌──────────────────────────┐
  │  BFF    │  shapes & aggregates         │  Personal API (the body) │  shapes vendors into
  └─────────┘                              └──────────────────────────┘  one agent-shaped contract
     ├─► auth service                         ├─► phone, email, wallet
     ├─► orders service                       ├─► sandbox (compute)
     └─► payments service                     ├─► filesystem (storage)
                                              └─► todo (derived state)
```

The agent never orchestrates vendors directly, the same way a good web frontend never
orchestrates microservices directly.

## 8. Event-driven + hexagonal: how the contract holds

Two commitments keep the contract stable while the messy parts churn:

- **Hexagonal (ports & adapters).** The contract is the *port*; each vendor is a swappable
  *adapter*. Swapping a phone vendor or re-provisioning the VM changes an adapter — never the
  contract the agent depends on.
- **Event-driven.** The agent doesn't poll-and-wait. It **pushes** intent (`POST /todo`); the
  system **emits events** as state changes, fanning out as webhooks to the principal's channels.
  Pull (`GET /todo`) and push (state-change → webhook) are the only two interaction patterns.

## 9. Unrestricted, but sandboxed — and that's the deal

The agent's computer is **unrestricted** (it can run anything) precisely because it is
**sandboxed**: an isolated VM, a wallet with a hard prepaid ceiling, no access to the
principal's real accounts. The blast radius is contained, so the principal can hand over a
complete loop comfortably. And because the provider controls the sandbox, they can **peer in** —
computer, storage, conversation history, API calls all visible. Troubleshooting is "look at the
sandbox," not "ask the client to screen-share." That's what makes QA-and-maintenance cheap
enough to take off the client's hands.

## 10. The service model and the Agent Success Manager

The product is not software the principal logs into; it's **work delivered into a body the
principal's agent can observe and direct.** It is, in effect, **SaaS with no dashboard and no
account** — the provider hands new primitives to the client's agent. The rules:

1. The principal must have an agent. We plug into it; we don't replace it.
2. The principal owns their data and connections.
3. We expose an opinionated API, not a configuration burden.
4. Primitives are deployed on their behalf; the principal manages no vendors.

The front-of-house reframe:

> Instead of a **Customer Success Manager**, the provider runs an **Agent Success Manager** — a
> narrow interface whose only job is to surface deliverables, progress, and issues to the
> principal's agent.

Production, QA, and procurement happen behind it. The principal's only obligations are **approve
budgets** and **load the wallet**.

## 11. The target user

Not a technical buyer. A high-level executive who lives in Claude and wants to interface by
phone or email, have their agent do the low-level computer/storage work, and own none of the
plumbing — no VPS, no API keys, no vendor accounts, not even their own card/phone/email plugged
in. They're fine with unrestricted compute *because it's sandboxed*. All they care about is the
deliverable.

## 12. Open vs. hosted

- **Open:** the protocol — the primitives, the `/todo` loop, the body/brain split, the budget
  envelope, the read-only boundary, extensibility (see [SPEC.md](./SPEC.md)).
- **Hosted (reference implementation):** a provider wiring real adapters and running an agency
  (team + ASM) on top. The open spec is the credibility and moat-by-adoption; the hosted service
  is the proof.

## 13. Open questions & risks

- **Compute pricing/limits** (Freestyle VM CPU/mem/disk, idle suspend) — affects unit economics;
  confirm before pricing an offer.
- **Wallet authorization + KYC/ToS** — autonomous signup may violate some vendors' terms; gate
  behind explicit authorization and per-vendor judgment.
- **Read-only enforcement at scale** — single-node needs none; multi-tenant needs a server-side
  boundary (e.g. Freestyle-Git clone-only identities).
- **Channel media limits** — embedding video in SMS/iMessage vs. delivering by email attachment.
- **Offer pricing** — a low entry price can't fund a human service team; treat the subscription
  as the *body + interface* and bill production as budgeted engagements through the wallet.
