# Scenarios — the formula made concrete

Companion to [SPEC.md](./SPEC.md). The spec is abstract on purpose; this doc plays out a real
service end to end so the six primitives stop being a diagram.

---

## Scenario 1 — A creative agency delivering 10 ads per month

### The cast

- **Maya** — founder of a DTC sleep-supplement brand. Lives in Claude (Claude Code + cowork).
  She uses her own agent for *everything*. She does **not** want to own ad production. She
  wants to hand over a brief and get back finished assets. That's all.
- **Lumen** — a new-style creative agency. It does **not** sell dashboards or hourly design.
  It provisions a **programmable assistant** for each client and owns the QA, oversight, and
  maintenance of the agent that drives it.
- **Soma** — the headless platform. Exposes the six primitives. Operates no agents. Lumen
  runs on top of it.

### What Maya never does

No VPS. No API keys. No vendor accounts. She does not plug in her own credit card, her own
phone number, her own email, or her Google Drive. There is no dashboard to log into and no
account to manage. She briefs, and she receives.

---

### Step 0 — Provisioning (Lumen, once)

Lumen spins up an Assistant for Maya. Six primitives, deployed on her behalf:

| Primitive | Provisioned as |
|---|---|
| **Phone** | `+1 (415) 555-0123` — Maya texts/calls this to brief and to hear status |
| **Email** | `studio@maya-brand.soma.run` (client-facing) + a hidden `ops@…` inbox for signups/receipts |
| **Wallet** | a prepaid virtual card under a cardholder named for Maya's account |
| **Computer** | a Linux VM with the production toolchain (ffmpeg + the gen pipeline) installed |
| **Storage** | a git repo (`wip`/`delivered` branches) + an S3 bucket for the heavy MP4s |
| **Todo** | the work-state loop, queryable at `/todo` |

Maya does exactly two things: **authorizes a budget envelope** ("up to $300/mo on tooling for
ad production") and **loads the wallet**. Done. She closes the tab.

---

### Step 1 — The brief (Maya's agent → the API)

Maya doesn't open anything new. From inside her own Claude, she says: *"Send my new-month ad
brief to the studio."* Her agent calls the one opinionated endpoint:

```
POST /todo
{
  "title": "October ads — 10x",
  "brief": "10 ads, 9:16, sleep supplement. Hooks around 'can't fall asleep' and
            '3am wakeups'. Use the brand kit in storage. UGC-style, mobile-native.",
  "count": 10,
  "budget_ref": "envelope_oct"
}
```

(She could equally have just **texted the phone number** the same brief in plain English —
the ASM parses it into the same `/todo` entries. Same loop, different channel.)

Soma creates ten todos, `td_01 … td_10`, each in state `requested`. Maya's agent gets back the
ids. Maya is done for now.

---

### Step 2 — The loop, per ad (the agent + the primitives)

Lumen's maintained agent picks up `td_01`, moves it to `accepted → in_production`, and runs a
**complete loop** using the primitives — no human hand-holding the keystrokes:

1. **Storage (read):** pulls the brand kit and prior winners from the git repo + S3.
2. **Computer:** on the VM, generates the hero frame, runs the gen pipeline for a 9:16 UGC
   clip, burns captions, normalizes audio — all the ffmpeg/render work, unrestricted, in the
   sandbox.
3. **Wallet + Email (procurement, only when needed):** the clip needs a licensed track. The
   agent signs up for the music service **using the `ops@` email** (verification link lands
   there), pays **with the prepaid wallet card**, within the $300 envelope. The receipt
   archives in the ops inbox. Maya never sees it; the cost is itemized to her account.
4. **Storage (write):** the render lands in S3; the recipe + the pointer + the todo state get
   committed to the `wip` branch. `td_01.artifacts = ["s3://…/ad-01-v1.mp4"]`.
5. **Todo:** `td_01` → `qa`.

The agent fans this out across all ten. Spend accrues against the envelope; if it would breach
the ceiling, it stops and raises an issue rather than overspending.

---

### Step 3 — QA (what Lumen actually owns)

This is Lumen's product. A Lumen reviewer (human + a QA agent) **peers into the sandbox** —
the computer, the storage, the conversation history, the API calls — and checks all ten ads.
No screen-share, no "can you send me the files," no VPS spelunking. It's all observable.

- 8 ads pass. The agent moves them `qa → delivered` by pushing them to the `delivered` branch.
- 2 ads are weak. Lumen sends them back to `in_production` with notes; the agent reworks them
  on `wip`.

Lumen carries the entire operational burden here — maintaining the agent, catching the misses,
keeping quality up — *without Maya having to maintain any of it.*

---

### Step 4 — Delivery (push → notification → Maya)

The push to `delivered` fires a signed webhook. The ASM turns it into delivery on Maya's
channels:

- **Email:** the finished MP4s arrive as attachments in a thread titled "October ads — batch 1
  (8 ready)."
- **Phone (SMS):** *"8 of your 10 October ads are ready — sent to your email. 2 more in
  rework, ETA shortly."*

Maya reviews from her own Claude (or her phone). No login. Her agent can also just query
`GET /todo` and narrate: *"8 delivered, 2 in rework, $214 of your $300 tooling budget used."*

---

### Step 5 — Revision (the one client write)

Maya: *"Ad 4's hook is flat — make it punchier."* Her agent posts the one allowed write:

```
POST /todo/td_04/comment
{ "note": "hook is flat, punch it up — try a pattern interrupt in first 0.5s" }
```

`td_04` flips back to `in_production`. The loop runs again. New version pushes to `delivered`.
Maya gets the updated ad by email. She approves: `td_04 → approved`.

By month end: 10 ads delivered, every cost itemized to Maya's wallet, full version history in
git, zero infrastructure touched by Maya.

---

### Why this isn't just "an agency with extra steps"

| Old way | This way |
|---|---|
| Client gets a Slack channel + Drive folder + status calls | Client briefs by text/email, receives by email; their agent queries `/todo` |
| Agency sets the client up with a VPS / tools / logins | Client owns no plumbing; the assistant *is* the plumbing, abstracted away |
| Costs are an opaque monthly invoice | Every external cost itemized per client via the wallet |
| Agency bills hours; quality depends on babysitting | Agency bills the deliverable; QA is cheap because the sandbox is observable |
| Client must manage accounts/dashboards | No dashboard, no account — just new primitives handed to their agent |

It behaves like SaaS, but there's nothing to log into. Maya's relationship is: **brief in,
assets out, talk to it like a person.** Lumen's product is **QA + maintenance of the loop**,
made economical by full sandbox visibility.

---

## Scenario 2 — Extending the model (a new primitive)

Three months in, Maya asks Lumen to also *publish* the winning ads, not just deliver them.

Lumen doesn't rebuild anything. It **adds a primitive** — a `publish` endpoint wrapping a
social-posting vendor — behind the same API and the same `/todo` loop:

```
# new primitive, additive — nothing else changes
POST /todo/td_04/publish
{ "platform": "meta", "schedule": "2026-10-14T09:00Z" }
```

The agent now has one more capability in its complete loop: it can take an `approved` ad and
push it live, paying any boost spend from the same wallet envelope, reporting back through the
same channels. Later they add an `analytics` primitive the same way — pull performance, feed
it back into the next month's brief.

The point: **primitives are additive.** The six are a starting set. Because each is a thin
wrapper over a vendor behind a stable interface, a provider — or anyone who forks the open
source — extends the assistant by adding endpoints, never by rewiring it.

---

## The shape of every scenario

Strip the creative work away and the loop is identical for any service — bookkeeping,
research, lead-gen, ops:

```
brief (phone/email or POST /todo)
   → agent runs the loop on the COMPUTER, reading/writing STORAGE
   → pays for what it needs via WALLET, signing up via EMAIL
   → provider QA's by peering into the sandbox
   → push to delivered → TODO transitions → deliver on the principal's channel
```

The deliverable type is interchangeable. The six primitives + the `/todo` loop are not.
