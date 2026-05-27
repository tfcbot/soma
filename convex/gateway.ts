import type { HttpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { api } from "./_generated/api";
import { json, paymentRequired, rateLimited, resolveAccount, type Account } from "./auth";
import { operations, type OperationId, type Input, type Output } from "../packages/contract/src/index";

// The gateway: builds the HTTP contract from the typed operation registry. Adding an endpoint
// is a registry entry + a typed handler — this file never changes. Every route gets the same
// spine: auth → rate limit (429) → credit meter (402) → input validation → handler → event log,
// with a refund if a metered, vendor-touching handler throws.

type Ctx = Parameters<Parameters<typeof httpAction>[0]>[0];

// The handler map is typed against the registry: a missing or mis-shaped handler is a COMPILE
// error. This is where end-to-end type safety is enforced (no codegen needed in a monorepo).
export type Handlers = {
  [K in OperationId]: (ctx: Ctx, account: Account, input: Input<K>) => Promise<Output<K>>;
};

function topupUrl(accountId: string): string {
  const base = process.env.SOMA_TOPUP_URL ?? "https://soma.example/topup";
  return `${base}?account=${encodeURIComponent(accountId)}`;
}

async function checkRate(ctx: Ctx, account: Account, op: string): Promise<Response | null> {
  const perMin = Number(process.env.SOMA_RATE_LIMIT_PER_MIN ?? 0);
  if (!perMin) return null;
  const res = await ctx.runMutation(api.ratelimit.consume, {
    bucket: `${account.accountId}:${op}`,
    limit: perMin,
    windowMs: 60_000,
  });
  return res.allowed ? null : rateLimited(res.retryAfter ?? 60, res.limit);
}

async function meter(
  ctx: Ctx,
  account: Account,
  op: string,
  costCents: number,
): Promise<Response | number> {
  if (costCents === 0) return 0;
  if (costCents > account.creditsCents) {
    return paymentRequired(
      `Operation ${op} costs ${costCents} credits; balance is ${account.creditsCents}.`,
      costCents,
      account.creditsCents,
      topupUrl(account.accountId),
    );
  }
  try {
    await ctx.runMutation(api.accounts.debitCredits, {
      accountId: account.accountId,
      amountCents: costCents,
    });
    return costCents;
  } catch {
    return paymentRequired(
      `Operation ${op} costs ${costCents} credits; insufficient balance.`,
      costCents,
      account.creditsCents,
      topupUrl(account.accountId),
    );
  }
}

function readInput(req: Request, op: (typeof operations)[OperationId]): unknown {
  if (op.inputFrom === "query") {
    const params = new URL(req.url).searchParams;
    return Object.fromEntries(params.entries());
  }
  return undefined; // body is read async by the caller
}

/** Register every operation in the registry as an HTTP route on `router`. */
export function buildRouter(router: HttpRouter, handlers: Handlers): void {
  for (const [opId, op] of Object.entries(operations)) {
    const handler = httpAction(async (ctx, req) => {
      const account = await resolveAccount(ctx, req);
      if (account instanceof Response) return account;

      const limited = await checkRate(ctx, account, opId);
      if (limited) {
        await recordEvent(ctx, account, opId, 0, "rate_limited");
        return limited;
      }

      const charged = await meter(ctx, account, opId, op.costCents);
      if (charged instanceof Response) {
        await recordEvent(ctx, account, opId, 0, "payment_required");
        return charged;
      }
      const refund = async () => {
        if (charged > 0)
          await ctx.runMutation(api.accounts.refundCredits, {
            accountId: account.accountId,
            amountCents: charged,
          });
      };

      // Validate input against the op's Zod schema (query for GET, JSON body otherwise).
      const raw = op.inputFrom === "query" ? readInput(req, op) : await req.json().catch(() => ({}));
      const parsed = op.input.safeParse(raw);
      if (!parsed.success) {
        await refund();
        return json({ error: "bad_request", message: parsed.error.message }, 400);
      }

      try {
        const fn = handlers[opId as OperationId] as (
          c: Ctx,
          a: Account,
          i: unknown,
        ) => Promise<unknown>;
        const output = await fn(ctx, account, parsed.data);
        await recordEvent(ctx, account, opId, charged, "ok");
        return json(output);
      } catch (err) {
        await refund();
        await recordEvent(ctx, account, opId, 0, "error");
        return json({ error: "operation_error", message: (err as Error).message }, 409);
      }
    });
    router.route({ path: op.path, method: op.method, handler });
  }
}

async function recordEvent(
  ctx: Ctx,
  account: Account,
  op: string,
  costCents: number,
  status: "ok" | "error" | "payment_required" | "rate_limited",
): Promise<void> {
  await ctx.runMutation(api.events.record, { accountId: account.accountId, op, costCents, status });
  const hook = process.env.SOMA_WEBHOOK_URL;
  if (hook) {
    // fire-and-forget; never block the response on the operator's webhook
    void fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId: account.accountId, op, costCents, status, ts: Date.now() }),
    }).catch(() => {});
  }
}
