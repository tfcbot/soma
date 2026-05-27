# Scenarios — the formula made concrete

Companion to [SPEC.md](./SPEC.md). The spec is abstract on purpose; this doc plays out a real
service end to end so the five faculties + the gateway stop being a diagram.

The shift to keep in mind: **the body gives the agent faculties; the agent runs the work.** Soma
does not track tasks or enforce a delivery workflow — it authenticates the key, meters each call,
and records what happened. Sequencing, retries, "is this approved" all live in the brain.

---

## Scenario 1 — A creative agency delivering 10 ads per month

### The cast

- **Maya** — founder of a DTC sleep-supplement brand. Lives in Claude (Claude Code + cowork). She
  uses her own agent for *everything*. She does **not** want to own ad production — she briefs and
  receives.
- **Lumen** — a new-style creative agency. It does **not** sell dashboards or hourly design. It
  provisions a **programmable assistant** for each client and owns the agent (and its QA) that
  drives it.
- **Soma** — the headless platform. Exposes the five faculties behind one metered gateway. Operates
  no agents. Lumen runs on top of it.

### What Maya never does

No VPS. No API keys. No vendor accounts. She does not plug in her own card, phone, email, or Drive.
There is no dashboard to log into. She briefs, and she receives.

---

### Step 0 — Provisioning (Lumen, once)

Lumen spins up an Assistant for Maya — five faculties, deployed on her behalf, reached through one
gateway:

| Faculty | Provisioned as |
|---|---|
| **Phone** | `+1 (415) 555-0123` — Maya texts this to brief and to hear status |
| **Email** | `studio@maya-brand.soma.run` (client-facing) + a hidden `ops@…` inbox for signups/receipts |
| **Wallet** | a prepaid virtual card (its `spendLimitCents` is the hard ceiling per card) |
| **Computer** | a Linux sandbox with the production toolchain (ffmpeg + the gen pipeline) |
| **Storage** | an object store for the heavy MP4s, with a public CDN for delivery |

Lumen mints a **metered API key** for the account and loads it with credits (Maya's spend with the
provider). Maya does one thing: approve the spend. She closes the tab. There is no `/todo`, no
state machine — the agent that Lumen maintains will coordinate the actual work.

---

### Step 1 — The brief (Maya's agent → Lumen's agent)

Maya doesn't open anything new. From inside her own Claude she says: *"Send my new-month ad brief
to the studio."* Her agent passes the brief to Lumen's agent (by email/phone faculty, or a shared
channel) — Soma does not model "intake". Lumen's agent now holds the work and **tracks the ten ads
in its own plan** (its own todo list, in the brain — not in the body).

She could equally have just **texted the phone number** the brief in plain English. Same loop,
different channel.

---

### Step 2 — The loop, per ad (the agent calls faculties directly)

Lumen's maintained agent works each ad by calling the gateway faculties itself — every call
authenticated by the key, metered against the credit balance, and recorded as an event:

1. **Storage (read):** `GET /v1/fs/objects` — pull the brand kit and prior winners.
2. **Computer:** `POST /v1/sandbox/exec` — generate the hero frame, run the gen pipeline for a 9:16
   UGC clip, burn captions, normalize audio. Unrestricted, isolated. The sandbox session persists
   across calls, so later `exec`/`getFile` see the same working tree.
3. **Wallet + Email (procurement, only when needed):** the clip needs a licensed track. The agent
   signs up for the music service using the `ops@` inbox (`POST /v1/email/messages` to receive the
   link), and pays with a card from `POST /v1/wallet/cards` — the card's prepaid limit is the hard
   ceiling. The receipt archives in the ops inbox.
4. **Storage (write):** `PUT /v1/fs/objects` (public) — the render lands in the store and gets a CDN
   url.
5. The agent records its own progress in its own plan and moves to the next ad.

Spend has two meters: the **credit balance** (each gateway call costs credits — visible at
`GET /v1/balance`) and the **prepaid card** (vendor spend, hard-capped per card). If credits run
out mid-batch, calls return `402` with a `topupUrl`; the agent pauses and asks for a top-up rather
than failing silently.

---

### Step 3 — QA + observability (what Lumen owns)

This is Lumen's product. A Lumen reviewer (human + a QA agent) inspects the work — the sandbox
contents, the stored renders, and the account's **event ledger** (`GET /v1/events`: every faculty
call, its cost, ok/error). No screen-share, no "can you send me the files," no VPS spelunking — it's
all observable. Weak ads get reworked; the agent reruns the relevant faculty calls. Lumen carries
the operational burden *without Maya maintaining anything.*

---

### Step 4 — Delivery (the agent calls the email faculty)

When the batch is ready, the agent simply uses a faculty: `POST /v1/email/messages` with the
finished MP4s attached by CDN url — a thread titled "October ads — batch 1 (8 ready)" — and a
`POST /v1/phone/messages` SMS: *"8 of your 10 October ads are ready — sent to your email. 2 in
rework."* Delivery is not a body state transition; it's the agent reaching Maya through the phone
and email faculties. Maya reviews from her own Claude or her phone. No login.

A Provider that wants push notifications wires the optional event webhook to fan `GET /v1/events`
activity out to a channel — but that's operator policy, not a workflow in the body.

---

### Step 5 — Revision (a conversation, not an endpoint)

Maya: *"Ad 4's hook is flat — make it punchier."* She tells **her agent**, which relays to Lumen's
agent. There is no `POST /todo/{id}/comment` — revision is the brains talking. Lumen's agent reruns
the compute + storage + email faculties for that one ad and re-delivers. "Approved" is something
Maya says, tracked by the agents, not a state column in Soma.

By month end: 10 ads delivered, every gateway call itemized in the event ledger, every vendor
charge bounded by the prepaid card, zero infrastructure touched by Maya.

---

### Why this isn't just "an agency with extra steps"

| Old way | This way |
|---|---|
| Client gets a Slack channel + Drive folder + status calls | Client briefs by text/email, receives by email; the agent does the rest |
| Agency sets the client up with a VPS / tools / logins | Client owns no plumbing; the assistant *is* the plumbing, abstracted away |
| Costs are an opaque monthly invoice | Every gateway call metered (events + credits); vendor spend capped by the prepaid card |
| Agency bills hours; quality depends on babysitting | Agency bills the deliverable; QA is cheap because the sandbox + event ledger are observable |
| Client manages accounts/dashboards | No dashboard, no account — just a body their agent drives |

It behaves like SaaS, but there's nothing to log into. Maya's relationship is: **brief in, assets
out, talk to it like a person.** Lumen's product is **the agent + its QA**, made economical by full
sandbox visibility and a metered, observable gateway.

---

## Scenario 2 — Extending the body (a new faculty)

Three months in, Maya asks Lumen to also *publish* the winning ads, not just deliver them.

Lumen doesn't rebuild anything. It **adds a faculty** — `publish`, wrapping a social-posting vendor
— the same way every endpoint exists: one entry in the typed operation registry (path, input/output
schema, credit cost) plus one handler. Because the registry is the single source of truth, the new
operation immediately appears in the server, the typed SDK, the MCP tools, the CLI, and the OpenAPI
spec — and is metered and observed like any other call:

```
POST /v1/publish/posts
{ "platform": "meta", "mediaUrl": "https://cdn…/ad-04.mp4", "schedule": "2026-10-14T09:00Z" }
```

The agent now has one more capability in its complete loop: take a finished ad and push it live,
paying any boost spend from a prepaid card, reporting back through the phone/email faculties. Later
they add an `analytics` faculty the same way — pull performance, feed it into next month's brief.

The point: **faculties are additive, and adding one is type-checked, not a rewire.** The five are a
starting set; a provider — or anyone who forks the open source — extends the body by adding a
registry entry + a handler.

---

## The shape of every scenario

Strip the creative work away and the loop is identical for any service — bookkeeping, research,
lead-gen, ops:

```
brief (the principal talks to their agent, over phone/email or any channel)
   → the AGENT coordinates the work, calling faculties through the metered gateway:
       run code on the COMPUTER, read/write STORAGE, pay via WALLET, sign up / deliver via EMAIL/PHONE
   → every call is authed, metered (credits → 402), and recorded (event ledger)
   → provider QAs by peering into the sandbox + the event ledger
   → the agent delivers by calling the email/phone faculty and reports back
```

The deliverable type is interchangeable. The five faculties + the metered gateway are not — and the
task tracking that used to live in the body now lives where it belongs: the brain.
