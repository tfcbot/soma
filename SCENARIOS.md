# Scenarios — what an agent-native service looks like

**Workstation is a metered key gateway for AI services.** Companion to [SPEC.md](./SPEC.md), which
is abstract on purpose; this doc plays out the actual buyer/seller loop end to end.

One principle: **the buyer's agent does the work — including buying.** The operator exposes a
metered HTTP contract; the buyer's agent (Claude Code, Cursor, custom) calls it, settles
tap-to-pay links the operator surfaces, and pays per call. The framework is the rail; the operator
is the service; the agent is the consumer.

---

## Scenario — Alex uses Overlayz from Claude Code

### The cast
- **Alex** — a marketer running TikTok ads. Lives in Claude Code in their terminal.
- **Overlayz** — an operator-built Workstation. It burns TikTok-safe text overlays on video **and**
  inline-scores the caption text against Meta/TikTok ad policy. Sold per call.

### Step 0 — Discovery
Alex sees Overlayz mentioned on a podcast. They tell Claude Code:
> *"I want to use Overlayz to caption my next 10 TikTok ads."*

Claude Code looks up the Overlayz MCP server (or hits its OpenAPI directly — Workstation generates
both from one contract, so either works).

### Step 1 — Signup (one-click pay)
Claude Code calls `POST https://api.overlayz.dev/v1/signup {amountCents: 2000}` → returns
`{url, claimToken}`. It surfaces the link to Alex:
> *"Overlayz wants $20 to get started — here's the Stripe link. Tap to pay."*

Alex taps, pays with a saved card. Claude Code is polling `/v1/signup/claim` in the background.
~30 seconds later it gets `{status: "completed", apiKey, creditsCents: 2000}` and saves the key
to `~/.workstation/config.json`. Alex is back at work.

### Step 2 — First call: caption + risk score in one shot
Alex says:
> *"Caption `ad-1.mp4` with 'BUY NOW — LIMITED TIME', top position."*

Claude Code:
1. Uploads `ad-1.mp4` to Overlayz's Storage (`PUT /v1/fs/objects {public: true}`) → CDN URL.
2. Calls `POST /v1/overlay {videoUrl, text: "BUY NOW — LIMITED TIME", position: "top"}`.

Overlayz's response — captioned video **and** the ad-safety read, in one call:
```json
{
  "resultUrl": "https://cdn.overlayz.dev/out/abc.mp4",
  "riskScore": 0.78,
  "risks": [
    { "policy": "Meta Advertising — urgency claims",        "snippet": "LIMITED TIME" },
    { "policy": "TikTok Ads — high-pressure language",       "snippet": "BUY NOW" }
  ]
}
```

Claude Code surfaces it:
> *"Done — captioned video [here]. **Risk score 0.78** (high). Two policy flags: 'urgency claims'
> (Meta) and 'high-pressure language' (TikTok). Want me to rewrite and re-render?"*

Alex: "yes, soften it." Claude Code re-calls `/v1/overlay` with new text, gets a risk score of
0.12, ships it.

Every call debits credits per the operator's pricing (`overlay` at $0.50, storage write at $0.02).
Alex's $20 buys ~40 captioned ads — and the compliance check costs nothing extra, because Overlayz
bundled it into the same op. **One call, two values, one debit.**

### Step 3 — Out of credits
After the tenth ad, Alex is down to $0.30 in credits. The next overlay call returns:
```json
{
  "type": "https://paymentauth.org/problems/payment-required",
  "status": 402,
  "detail": "Operation overlay costs 50 credits; balance is 30.",
  "topupUrl": "https://overlayz.dev/?account=acc_..."
}
```
Claude Code surfaces:
> *"Out of credits. Top up $10 to keep going? [link]"*

Same one-tap flow as signup. Alex pays. Back to working.

### Step 4 — Wrap
Alex has 10 captioned, risk-scored TikTok ads, all sitting on Overlayz's CDN. They paste the URLs
into Ads Manager. Total cost: $25. Total time: ~20 minutes. No SaaS dashboard, no contractor, no
`apt-get install ffmpeg`, no separate compliance vendor.

### What didn't happen
- **No SaaS dashboard** Alex had to log into.
- **No vendor accounts** (Twilio, ffmpeg, Whisper, an ad-policy API) Alex had to wire.
- **No concierge agent** in between. Claude Code talked to the API directly.
- **No "comms" primitive** — when Alex shares results, that's Claude Code's job over whatever it
  already uses (Slack, email, file paste).

---

## The shape of every Workstation scenario

A buyer using an agent (Claude Code, Cursor, custom) **signs up via one-click pay**, gets a
**metered key**, and their agent **calls the operator's services**. Each call debits credits. A
`402` triggers another tap-to-pay. The framework provides keys + access control + metering +
signup + the typed contract; the operator provides the capabilities they monetize.

```
buyer's agent  ──HTTP──►  operator's Workstation
  signs up                   gateway:       auth → scopes → meter → events
  pays one-tap               capabilities:  the operator's services
  calls per work             credits:       prepaid, debited per call
  reads results              402:           topup link, same tap-to-pay shape
```

The deliverable is the URL (or JSON) the operator's service returns. Status updates, sharing, and
follow-up happen in whatever surface the buyer's agent already lives in. **Workstation's job is the
metered rail and the contract, not the UX around it.**

Replace "Overlayz" with any service shape — a render farm, a niche dataset API, a vendor
aggregator, a long-job worker — and the loop is identical. The operator picks the capabilities;
the gateway makes them sellable per call.
