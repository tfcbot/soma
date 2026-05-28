# Thesis — Workstation

The reasoning and philosophy behind the protocol. This doc explains *why*; the normative,
implement-anywhere contract lives in [SPEC.md](./SPEC.md), and a concrete walkthrough in
[SCENARIOS.md](./SCENARIOS.md).

---

## 1. The idea: your AI brain needs a workstation

A language model can think, plan, and decide. What it cannot do is *act in the world* — it has
no phone to reach people, no machine to run code on, no place to keep files, no inbox. A brilliant worker with no desk gets nothing done.

A **workstation** is the equipped place an agent works: a small, fixed set of tools — **phone**,
**email**, **computer**, **storage** — behind one metered gateway. Together they give an agent a
*complete loop*: be briefed, do the work, keep its outputs, and report back — without ever borrowing
the principal's own phone, email, or machine. The agent coordinates its own work; the workstation
supplies the tools and meters their use.

| | What it is | Who owns it |
|---|---|---|
| **Workstation** | the tools + the metered gateway — where work happens | provided/hosted; headless |
| **Agent (the brain)** | the LLM loop, reasoning, judgment, task-tracking | the principal (bring your own) |

We open-source **the workstation**. You bring **the brain**. The principal already has an agent —
Claude Code, Claude for cowork, whatever they live in. We don't ask them to adopt ours or
reconfigure theirs; we hand their agent one opinionated API: a workstation it can sit down at.
Most products try to *be* the agent. This one refuses to — it's the workstation the agent works
from. You can run one for your own agent, or operate Workstations that other people's agents work
at; the metered gateway is built for both.

## 2. None of this is new — and that's the point

The brain/workstation split is just **separation of concerns**, **stable interfaces**, and
**dependency inversion** — decades-old engineering principles, applied to a place that currently
ignores them: the agent itself.

Dependency inversion says high-level policy should not depend on low-level detail; both should
depend on a **stable abstraction**:

- The **agent (brain)** is high-churn and volatile. Models are replaced on a monthly cadence; the
  agent you build on today is obsolete within a release or two.
- The **workstation** (the operating layer) is the stable abstraction. It changes additively and
  on its own schedule, not the model vendors'.

So we invert the dependency: **the volatile brain depends on the durable contract, never the
reverse.** That is the entire reason the split is worth drawing.

## 3. Why "raw API + skills" rots, and a durable workstation doesn't

The prevailing pattern today — Claude Code, Codex, OpenClaw et al. driving **raw vendor APIs plus
skills/prompts** — produces *cheap, ephemeral software*. Fast to stand up, genuinely useful. But
the capability lives **inside the agent layer**, in prompts and glue the agent re-derives at
runtime. Two compounding costs:

1. **It's expensive to keep rewriting.** Logic in prompts/skills gets re-implemented and re-run
   constantly — you **blow tokens** re-establishing the same plumbing every session instead of
   calling a stable endpoint once. Ephemeral software has to be re-summoned; durable software is
   just *there*.
2. **Migration is brutal when the agent goes out of date.** The instant a better agent ships,
   everything baked into the old agent layer has to be ported. The investment was in the
   **disposable** layer, so it's thrown away with it.

A durable workstation flips this. Capability lives in the **contract**, not in any one agent.
When a new agent appears, you don't migrate — you **re-point**:

```
      ephemeral (raw API + skills)              durable (the workstation)
      ────────────────────────────             ──────────────────────────
2025   Claude Code ─┐                           Claude Code ─┐
                     ├─ glue lives IN the                     │
2026   Codex ───────┤   agent; replace the       Codex ──────┤
                     │   agent → rewrite          OpenClaw ───┼──► Workstation
2027   OpenClaw ────┤   everything                            │    (stays put;
                     │                            future ─────┘     tools live HERE)
2028   new model ───┘                            model
       each switch = re-implement + re-spend     each switch = change one endpoint URL
```

The contract, the credit balance, the stored files, the usage history, the procurement glue all persist
across agent generations. Agent obsolescence becomes a URL change instead of a rewrite. This is
also the honest version of "no lock-in": because we operate no agents and expose only a contract,
the principal is never married to a model vendor *or* to us — the same open interface runs on a
self-hosted workstation.

## 4. The durable layer is two-faced — and deterministic in the middle

The contract has two faces. The consumer side: the client's agent works at it. The maintainer
side: an agent, supervised by a human operator, **builds and maintains the workstation itself.**

```
   CONSUMER SIDE                  THE WORKSTATION              MAINTAINER SIDE
   (the principal)                (deterministic gateway)      (the provider)

   customer  ⇄  agent  ──────►  [ metered contract ]  ◄──────  infra  ◄──  agent  ⇄  operator
   (client²)   (brain)            auth · credits · events                   (brain)    (human)
```

Two agents, one contract between them. The principal's agent **works at** the workstation; the
operator's agent **owns making the updates** — adding tools, hardening adapters, re-provisioning
the sandbox — under human oversight. The maintenance that was a permanent tax in the VPS world is
now *itself* done by an agent, with the human as supervisor rather than keyboard operator.

> Note the double meaning of **client**: the *client* in the computer-science sense (the calling
> agent) **and** the *client* in the customer sense (the human paying). The contract serves both
> at once, which is why a clean one matters.

**Why a deterministic middle solves a class of bugs.** LLM agents are **stochastic**. If
business-critical logic — who you are (accounts), what a call costs (the credit ledger), whether
you may make it (metering and rate limits) — lived *inside* an agent, the whole system would
inherit that non-determinism: untestable, irreproducible, untrustworthy. The workstation's
gateway puts that logic in a **deterministic** layer (pure functions + a transactional ledger).
Agents become *callers of* a deterministic core, never the core itself. That gateway is the
**firebreak** that absorbs non-determinism on both ends — and, deliberately, it holds no workflow
or task state: sequencing the work is the brain's job, not the workstation's.

## 5. Metering: cost control — and a billable service

The same split that buys determinism buys **fine-grained cost control** on both axes that cost
money.

**Token spend (agent axis).** When work lives in the agent loop, *everything* is paid in tokens —
including deterministic plumbing the agent re-derives each session. Pushing that behind the
contract turns it into cheap fixed-cost API calls, and reserves the model for judgment. That
unlocks **right-sizing the brain** (a cheaper agent can call the workstation), **no re-spend on
repeat work**, and **spend where the leverage is**.

**Tooling spend (gateway axis).** Every primitive call has a real vendor cost — the SMS, the
inbox, the VM, the stored bytes. Because it routes through *the contract*, each charge is a
**metered event** attributable to a specific call, not a monthly lump, and **one ceiling** holds it
deterministically in code, never by asking the agent to behave: the per-call **credit** debit (the
caller pays per use; an empty balance returns `402`).

The same mechanism is why a Workstation can be **operated as a service, not just used personally**:
because every call is a per-key, attributable, metered event, the operator can bill others' usage
through the exact gateway that meters their own — or turn metering off per endpoint and run it free.
Controlling your costs and charging for access are the same primitive, pointed two directions.

```
WHERE THE COST LANDS            opaque agent loop          at the workstation
────────────────────           ─────────────────          ───────────────────
deterministic plumbing         paid in tokens, re-run      fixed-cost API call, cacheable
model reasoning                paid in tokens              paid in tokens (unchanged — fine)
external tooling               opaque monthly invoice      metered per call (the event ledger)
spend ceiling                  "agent, stay under $X"      hard stop in code (per-call credit debit → 402)
attribution granularity        one bill                    per-call line items
```

## 6. The abstraction ladder: from VPS to a personal workstation

We move the client **up one rung** — from owning a *server* to owning a *contract*.

```
                      owns / manages         degrades?        who can run it
  Rung 0  VPS         the client runs it     YES — entropy    only a full-time ops person
          (raw)       (OS, deps, drift)      is the default
  Rung 1  Managed     someone else runs it   YES — still a    a provider, but the client
          VPS         but it's a *server*    server           still owns a server-shaped thing
  Rung 2  The         the client owns a      NO — a contract  the client's AGENT, zero ops
   ◄ HERE  Workstation *contract* its          is versioned,
                      agent works at            not maintained
```

**Why a contract beats a server: entropy.** A VPS is a stateful, mutable system, and every such
system degrades — packages drift, certs expire, someone SSHes in and changes something
undocumented. Maintenance is a *permanent tax* that only goes up. The workstation is a
**contract**, not a running thing the client holds:

| | VPS (a server) | The workstation (a contract) |
|---|---|---|
| Default trajectory | **degrades** | **stable** until versioned |
| Maintenance | a permanent tax on the *owner* | the *provider's* problem, behind the interface |
| Change management | mutate in place, hope | additive endpoints + explicit versioning |
| What the client reasons about | OS, deps, disk, uptime | request → response, and a webhook |
| Observability | "can you screen-share?" | the provider peers into the sandbox + event ledger |

The mutable, rotting part still exists — the sandbox VM, the disk — but it's now **behind** the
contract, on the provider's side, re-provisioned from clean state at will (the VM is cattle, not a
pet). The client never owns the part that degrades.

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
  │  BFF    │  shapes & aggregates         │   The Workstation        │  shapes vendors into
  └─────────┘                              └──────────────────────────┘  one agent-shaped contract
     ├─► auth service                         ├─► phone, email
     ├─► orders service                       ├─► computer (sandbox)
     └─► payments service                     ├─► storage (filesystem)
                                              └─► metered gateway (accounts, credits, events)
```

The agent never orchestrates vendors directly, the same way a good web frontend never orchestrates
microservices directly.

## 8. Event-driven + hexagonal: how the contract holds

Two commitments keep the contract stable while the messy parts churn:

- **Hexagonal (ports & adapters).** Each tool is a *port*; each vendor is a swappable *adapter*.
  Swapping a phone vendor or re-provisioning the sandbox changes an adapter — never the contract
  the agent depends on. Adding a tool is a new port + adapter, additively.
- **Event-driven.** The agent calls a tool; the gateway records a **usage event** and may fan it
  out as a webhook to the principal's channels. Pull (`GET`) and push (event → webhook) are the
  only two interaction patterns, and the event ledger is the workstation's unit of observability.

## 9. Unrestricted, but sandboxed — and that's the deal

The computer at the workstation is **unrestricted** (it can run anything) precisely because it is
**sandboxed**: an isolated VM with no payment instrument and no access to the principal's real
accounts. The blast radius is contained, so the principal can hand over a complete loop
comfortably. And because the provider controls the sandbox, they can **peer in** — computer,
storage, the event ledger, the API calls all visible. Troubleshooting is "look at the workstation,"
not "ask the client to screen-share." That's what makes QA-and-maintenance cheap enough to take off
the client's hands.

## 10. The service model and the Agent Success Manager

The product is not software the principal logs into; it's **a workstation the principal's agent
works at, which the principal can observe and direct.** It is, in effect, **SaaS with no dashboard
and no account to manage** — the provider hands new tools to the client's agent. The rules:

1. The principal must have an agent. We plug into it; we don't replace it.
2. The principal owns their data and connections.
3. We expose an opinionated API, not a configuration burden.
4. Tools are deployed on their behalf; the principal manages no vendors.

The front-of-house reframe:

> Instead of a **Customer Success Manager**, the provider runs an **Agent Success Manager** — a
> narrow interface whose only job is to surface deliverables, progress, and issues to the
> principal's agent.

Production, QA, and procurement happen behind it. The principal's only obligation is to **fund the workstation** (credits).

## 11. Who runs a Workstation

Two roles — often the same person at first. The **operator** stands up and runs a Workstation:
for their own agent, or as a metered service whose per-key accounts, credits, and event ledger let
them meter (and bill) others' usage. The **principal** is whoever's agent works at it — they own
their data and connections and need no plumbing (no VPS, no API keys, no vendor accounts, not even
their own phone/email/data plugged in), and they're fine with unrestricted compute *because it's
sandboxed*. Self-hosting, operator and principal are one. Run as a service, they're distinct — but
either way what's exposed is one opinionated, metered API, never a configuration burden.

## 12. Open vs. hosted

- **Open:** the protocol — the tools, the metered gateway (per-key accounts, credits, rate limits,
  the event ledger), the brain/workstation split, and extensibility (see [SPEC.md](./SPEC.md)).
- **Hosted (reference implementation):** a provider wiring real adapters and running an operation
  (team + ASM) on top. The open spec is the credibility and moat-by-adoption; the hosted service is
  the proof.

## 13. Open questions & risks

- **Compute pricing/limits** (Freestyle VM CPU/mem/disk, idle suspend) — affects unit economics;
  confirm before pricing an offer.
- **Sandbox sessions at scale** — a workstation's sandbox should persist across calls per account;
  multi-tenant needs isolation between principals' VMs and files.
- **Channel media limits** — embedding video in SMS/iMessage vs. delivering by email attachment.
- **Pricing** — price workstation access (credits) so it covers vendor cost and funds the operation.
