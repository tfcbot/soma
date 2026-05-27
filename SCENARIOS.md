# Scenarios — the idea made concrete

**Workstation is a headless contract for agents that do work.** Companion to [SPEC.md](./SPEC.md): the
spec is abstract on purpose, so this doc plays out a real service end to end.

One principle runs through every scenario: **the body gives the agent primitives; the agent does the
work.** Workstation authenticates the key, meters each call, and records what happened — phone, email,
wallet, compute, storage, behind one gateway. Sequencing, retries, and "is this done" live in the
agent (the brain), never in the body.

---

## Scenario 1 — A creative agency delivering 10 ads per month

### The cast

- **Maya** — founder of a DTC sleep-supplement brand. She lives in Claude and uses her own agent
  for everything. She does not want to own ad production: she briefs, and she receives.
- **Lumen** — a new-style creative agency. It sells neither dashboards nor hourly design. It
  provisions an assistant per client and owns the agent (and its QA) that drives it.
- **Workstation** — the headless platform: five primitives behind one metered gateway. It operates no
  agents; Lumen runs on top of it.

Maya owns no plumbing — no VPS, no API keys, no vendor accounts, no card or phone or inbox plugged
in, no dashboard to log into. She briefs, and she receives.

### Step 0 — Provisioning (Lumen, once)

Lumen stands up an assistant for Maya: five primitives, deployed on her behalf, reached through one
gateway.

| Primitive | Provisioned as |
|---|---|
| **Phone** | `+1 (415) 555-0123` — Maya texts this to brief and to hear status |
| **Email** | `studio@maya-brand.workstation.run` (client-facing) + a hidden `ops@…` inbox for signups/receipts |
| **Wallet** | a prepaid virtual card; its `spendLimitCents` is the hard ceiling |
| **Computer** | a Linux sandbox with the production toolchain (ffmpeg + the gen pipeline) |
| **Storage** | an object store for the heavy MP4s, with a public CDN for delivery |

Lumen mints a metered API key and loads it with credits. Maya approves the spend and closes the
tab. Lumen's agent will coordinate the actual work.

### Step 1 — The brief

From inside her own Claude, Maya says: *"Send my new-month ad brief to the studio."* Her agent
hands the brief to Lumen's agent — by email or phone, or a shared channel. Lumen's agent now holds
the work and tracks the ten ads in its own plan. (She could equally have texted the brief to the
phone number in plain English — same loop, different channel.)

### Step 2 — The loop, per ad

Lumen's agent works each ad by calling the gateway primitives directly. Every call is authenticated
by the key, metered against the credit balance, and recorded as an event:

1. **Storage (read)** — `GET /v1/fs/objects`: pull the brand kit and prior winners.
2. **Computer** — `POST /v1/sandbox/exec`: generate the hero frame, run the gen pipeline for a 9:16
   UGC clip, burn captions, normalize audio. Unrestricted, isolated; the sandbox session persists
   across calls, so a later `exec`/`getFile` sees the same working tree.
3. **Wallet + Email** — only when needed: the clip wants a licensed track, so the agent signs up
   for the music service (link lands in the `ops@` inbox) and pays with a card from
   `POST /v1/wallet/cards`, whose prepaid limit is the hard ceiling. The receipt archives in ops.
4. **Storage (write)** — `PUT /v1/fs/objects` (public): the render lands in the store with a CDN url.

Spend has two meters: the **credit balance** (each gateway call costs credits; visible at
`GET /v1/balance`) and the **prepaid card** (vendor spend, capped per card). If credits run low
mid-batch, calls return `402` with a `topupUrl`; the agent pauses and asks for a top-up rather than
failing silently.

### Step 3 — QA and observability (Lumen's product)

A Lumen reviewer — human plus a QA agent — inspects the work: the sandbox contents, the stored
renders, and the account's **event ledger** (`GET /v1/events` — every primitive call, its cost,
ok/error). No screen-share, no "can you send me the files," no VPS spelunking; it is all
observable. Weak ads get reworked; the agent reruns the relevant calls. Lumen carries the
operational burden so Maya maintains nothing.

### Step 4 — Delivery

When the batch is ready the agent uses a primitive: `POST /v1/email/messages` with the finished MP4s
attached by CDN url ("October ads — batch 1, 8 ready"), and a `POST /v1/phone/messages` SMS:
*"8 of your 10 October ads are ready — sent to your email. 2 in rework."* Maya reviews from her own
Claude or her phone. No login. A Provider that wants push can wire the optional event webhook to
fan activity out to a channel.

### Step 5 — Revision

Maya: *"Ad 4's hook is flat — make it punchier."* She tells her agent, which relays to Lumen's
agent; it reruns the compute, storage, and email primitives for that one ad and re-delivers.
Approval is something Maya says and the agents track.

By month end: 10 ads delivered, every gateway call itemized in the event ledger, every vendor
charge bounded by the prepaid card, zero infrastructure touched by Maya.

### Why this isn't just "an agency with extra steps"

| Old way | This way |
|---|---|
| Client gets a Slack channel + Drive folder + status calls | Client briefs by text/email and receives by email; the agent does the rest |
| Agency sets the client up with a VPS, tools, and logins | Client owns no plumbing; the assistant *is* the plumbing, abstracted away |
| Costs arrive as an opaque monthly invoice | Every gateway call metered (events + credits); vendor spend capped by the prepaid card |
| Agency bills hours; quality depends on babysitting | Agency bills the deliverable; QA is cheap because the sandbox and event ledger are observable |
| Client manages accounts and dashboards | No dashboard, no account — just a body their agent drives |

It behaves like SaaS with nothing to log into. Maya's relationship is *brief in, assets out, talk
to it like a person.* Lumen's product is the agent and its QA, made economical by full sandbox
visibility over a metered, observable gateway.

---

## Scenario 2 — Extending the body (a new primitive)

Three months in, Maya asks Lumen to also *publish* the winning ads, not just deliver them.

Lumen adds a primitive — `publish`, wrapping a social-posting vendor — the way every endpoint is
born: one entry in the typed operation registry (path, input/output schema, credit cost) plus one
handler. Because the registry is the single source of truth, the new operation appears at once in
the server, the typed SDK, the MCP tools, the CLI, and the OpenAPI spec — metered and observed like
any other call:

```
POST /v1/publish/posts
{ "platform": "meta", "mediaUrl": "https://cdn…/ad-04.mp4", "schedule": "2026-10-14T09:00Z" }
```

The agent gains one more capability: take a finished ad and push it live, paying any boost from a
prepaid card, reporting back through the phone and email primitives. An `analytics` primitive arrives
the same way — pull performance, feed it into next month's brief. **Primitives are additive, and
adding one is type-checked, not a rewire.**

---

## The shape of every scenario

Strip the creative work away and the loop is identical for any service — bookkeeping, research,
lead-gen, ops:

```
The principal briefs their agent (over phone/email, or any channel).
The AGENT coordinates the work, calling primitives through the metered gateway:
  run code on the COMPUTER · read/write STORAGE · pay via WALLET · sign up & deliver via EMAIL/PHONE
Every call is authenticated, metered (credits → 402), and recorded (event ledger).
The provider QAs by peering into the sandbox and the event ledger.
The agent delivers through the email/phone primitive and reports back.
```

The deliverable is interchangeable. The five primitives and the metered gateway are the constant —
and the work itself belongs to the brain.
