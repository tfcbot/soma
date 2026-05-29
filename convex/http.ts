import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { buildRouter } from "./gateway";

// The metered contract is built from the operation registry (packages/contract). To add an
// endpoint: add a registry op (+ its port adapter, or a gateway handler) — not here.
const router = httpRouter();
buildRouter(router);

// Stripe webhook — not a contract op: Stripe calls it with no bearer key; the signature is
// verified in convex/payments.ts (node). On a paid top-up it credits the account via grantCredits.
router.route({
  path: "/webhooks/stripe",
  method: "POST",
  handler: httpAction(async (ctx, req) => {
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature") ?? "";
    try {
      await ctx.runAction(internal.payments.handleStripeWebhook, { payload, signature });
    } catch {
      return new Response(
        JSON.stringify({ error: "webhook_error", message: "Stripe webhook verification failed." }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }),
});

export default router;
