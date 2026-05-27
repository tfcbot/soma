"use node";
import { internalAction } from "./_generated/server";
import { api } from "./_generated/api";
import { v } from "convex/values";
import Stripe from "stripe";

// Reference payment rail — the raw `stripe` SDK (à la VidJutsu), wired to the grantCredits seam.
// Env-gated on STRIPE_SECRET_KEY; if unset, /v1/topup errors and the webhook no-ops. Swap this
// module for another rail (x402, Lemon Squeezy, manual) without touching the gateway.
function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("stripe_not_configured: set STRIPE_SECRET_KEY to enable top-ups");
  return new Stripe(key);
}

// Create a Checkout session that buys `amountCents` of credits (1:1 USD cents → credits).
export const createTopupCheckout = internalAction({
  args: { accountId: v.string(), amountCents: v.number() },
  returns: v.object({ url: v.string() }),
  handler: async (_ctx, { accountId, amountCents }) => {
    const stripe = getStripe();
    const base = process.env.WORKSTATION_TOPUP_URL ?? "https://workstation.example/topup";
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
      // Read back on webhook to credit the right account.
      metadata: { type: "topup", accountId, credits: String(amountCents) },
      success_url: `${base}?status=success`,
      cancel_url: `${base}?status=cancel`,
    });
    return { url: session.url! };
  },
});

// Stripe → us. Verify the signature, then credit the account via the grantCredits seam.
export const handleStripeWebhook = internalAction({
  args: { payload: v.string(), signature: v.string() },
  returns: v.object({ handled: v.boolean() }),
  handler: async (ctx, { payload, signature }) => {
    const stripe = getStripe();
    const secret = process.env.STRIPE_WEBHOOK_SECRET;
    const event = secret
      ? stripe.webhooks.constructEvent(payload, signature, secret) // verified
      : (JSON.parse(payload) as Stripe.Event); // unverified fallback if no secret set
    if (event.type === "checkout.session.completed") {
      const s = event.data.object as Stripe.Checkout.Session;
      const accountId = s.metadata?.accountId;
      const credits = Number(s.metadata?.credits ?? 0);
      if (accountId && credits > 0) {
        await ctx.runMutation(api.accounts.grantCredits, { accountId, amountCents: credits });
        return { handled: true };
      }
    }
    return { handled: false };
  },
});
