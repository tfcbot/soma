"use node";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

// Reference payment rail — raw `stripe` SDK (à la VidJutsu), wired to the grantCredits seam via
// the idempotent topups:creditOnce mutation. Env-gated on STRIPE_SECRET_KEY. Swap rails by
// replacing this one file. Both the webhook and the poll path credit through creditOnce, so a
// Checkout session is credited at most once.
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("stripe_not_configured: set STRIPE_SECRET_KEY to enable top-ups");
  return new Stripe(key);
}

// Resolves the public landing URL (operator's deployed apps/web). Falls back to the deprecated
// WORKSTATION_TOPUP_URL so existing deployments don't break on pull.
function landingBase(): string {
  return (
    process.env.WORKSTATION_LANDING_URL ??
    process.env.WORKSTATION_TOPUP_URL ??
    "https://workstation.example"
  );
}

// Create a Checkout session that buys `amountCents` of credits (1:1 USD cents → credits).
export const createTopupCheckout = internalAction({
  args: { accountId: v.string(), amountCents: v.number() },
  returns: v.object({ url: v.string(), sessionId: v.string() }),
  handler: async (_ctx, { accountId, amountCents }) => {
    const stripe = getStripe();
    const base = landingBase();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Workstation credits" },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { type: "topup", accountId, credits: String(amountCents) },
      success_url: `${base}/success?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cancel`,
    });
    return { url: session.url!, sessionId: session.id };
  },
});

// POLL path (no webhook needed): retrieve the session; if paid, credit (idempotently). The caller
// may only confirm a session it created (metadata.accountId must match).
export const confirmTopup = internalAction({
  args: { sessionId: v.string(), accountId: v.string() },
  returns: v.object({ status: v.string(), creditsCents: v.optional(v.number()) }),
  handler: async (ctx, { sessionId, accountId }): Promise<{ status: string; creditsCents?: number }> => {
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") return { status: "pending" };
    if (session.metadata?.accountId !== accountId) return { status: "forbidden" };
    const credits = Number(session.metadata?.credits ?? 0);
    const res = await ctx.runMutation(api.topups.creditOnce, { sessionId, accountId, amountCents: credits });
    return { status: "completed", creditsCents: res.creditsCents };
  },
});

// WEBHOOK path (automatic): verify signature, credit (idempotently) on checkout.session.completed.
export const handleStripeWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  returns: v.object({ handled: v.boolean() }),
  handler: async (ctx, { payload, signature }) => {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const event = secret
      ? stripe.webhooks.constructEvent(payload, signature, secret)
      : (JSON.parse(payload) as Stripe.Event);
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const accountId = s.metadata?.accountId;
      const credits = Number(s.metadata?.credits ?? 0);
      if (accountId && credits > 0 && s.id) {
        await ctx.runMutation(api.topups.creditOnce, { sessionId: s.id, accountId, amountCents: credits });
        return { handled: true };
      }
    }
    return { handled: false };
  },
});

// ── Self-serve signup ───────────────────────────────────────────────────────────
// SIGNUP: create a Checkout session that buys `amountCents` of starting credits, plus an
// unguessable claimToken the (unauthenticated) buyer polls to retrieve the key the payment minted.
export const createSignupCheckout = internalAction({
  args: { amountCents: v.number(), scopes: v.optional(v.array(v.string())) },
  returns: v.object({ url: v.string(), claimToken: v.string() }),
  handler: async (ctx, { amountCents, scopes }): Promise<{ url: string; claimToken: string }> => {
    const stripe = getStripe();
    const base = landingBase();
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Workstation key + credits" },
            unit_amount: amountCents,
          },
          quantity: 1,
        },
      ],
      metadata: { type: "signup", credits: String(amountCents), scopes: (scopes ?? []).join(",") },
      success_url: `${base}/success?session={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/cancel`,
    });
    const claimToken = `claim_${crypto.randomUUID().replace(/-/g, "")}`;
    await ctx.runMutation(api.claims.storeClaim, { claimToken, sessionId: session.id });
    return { url: session.url!, claimToken };
  },
});

// CLAIM (poll, no webhook needed): once the session is paid, mint the key exactly once and return
// it. The key is shown a single time over HTTPS; re-claiming a minted token returns already_claimed.
export const claimSignup = internalAction({
  args: { claimToken: v.string() },
  returns: v.object({
    status: v.string(),
    apiKey: v.optional(v.string()),
    accountId: v.optional(v.string()),
    creditsCents: v.optional(v.number()),
  }),
  handler: async (
    ctx,
    { claimToken },
  ): Promise<{ status: string; apiKey?: string; accountId?: string; creditsCents?: number }> => {
    const claim = await ctx.runQuery(api.claims.resolve, { claimToken });
    if (!claim) return { status: "invalid_token" };
    if (claim.accountId) return { status: "already_claimed" };

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(claim.sessionId);
    if (session.payment_status !== "paid") return { status: "pending" };

    const credits = Number(session.metadata?.credits ?? 0);
    const scopes = (session.metadata?.scopes ?? "").split(",").filter(Boolean);
    const res = await ctx.runMutation(api.claims.fulfill, { claimToken, creditsCents: credits, scopes });
    if (!res) return { status: "already_claimed" }; // lost a race to another claim
    return { status: "completed", apiKey: res.apiKey, accountId: res.accountId, creditsCents: res.creditsCents };
  },
});
