import type { HttpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { json, paymentRequired, rateLimited, resolveAccount, type Account } from "./auth";
import { operations, type OperationId } from "../packages/contract/src/index";
import { gatewayHandlers } from "./gatewayHandlers";

// Builds the entire HTTP contract from the operation registry. Every route shares one spine:
// auth → rate limit (429) → meter (402) → validate → dispatch → event log, refund on failure.
// Dispatch is generic: a PORT op delegates to convex/invoke.ts (vendor, node runtime); a GATEWAY
// op runs an inline handler (account/DB). Adding an op never touches this file.
type Ctx = Parameters<Parameters<typeof httpAction>[0]>[0];

function topupUrl(accountId: string): string {
  const base = process.env.WORKSTATION_TOPUP_URL ?? "https://workstation.example/topup";
  return `${base}?account=${encodeURIComponent(accountId)}`;
}

async function checkRate(ctx: Ctx, account: Account, op: string): Promise<Response | null> {
  const perMin = Number(process.env.WORKSTATION_RATE_LIMIT_PER_MIN ?? 0);
  if (!perMin) return null;
  const res = await ctx.runMutation(api.ratelimit.consume, {
    bucket: `${account.accountId}:${op}`,
    limit: perMin,
    windowMs: 60_000,
  });
  return res.allowed ? null : rateLimited(res.retryAfter ?? 60, res.limit);
}

async function meter(ctx: Ctx, account: Account, op: string, costCents: number): Promise<Response | number> {
  if (costCents === 0) return 0;
  if (costCents > account.creditsCents) {
    return paymentRequired(
      `Operation ${op} costs ${costCents} credits; balance is ${account.creditsCents}.`,
      costCents, account.creditsCents, topupUrl(account.accountId),
    );
  }
  try {
    await ctx.runMutation(api.accounts.debitCredits, { accountId: account.accountId, amountCents: costCents });
    return costCents;
  } catch {
    return paymentRequired(
      `Operation ${op} costs ${costCents} credits; insufficient balance.`,
      costCents, account.creditsCents, topupUrl(account.accountId),
    );
  }
}

async function recordEvent(ctx: Ctx, accountId: string, op: string, costCents: number, status: string) {
  await ctx.runMutation(api.events.record, { accountId, op, costCents, status });
  const hook = process.env.WORKSTATION_WEBHOOK_URL;
  if (hook) {
    void fetch(hook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accountId, op, costCents, status, ts: Date.now() }),
    }).catch(() => {});
  }
}

export function buildRouter(router: HttpRouter): void {
  for (const [opId, op] of Object.entries(operations)) {
    const handler = httpAction(async (ctx, req) => {
      // 1. Auth (per-op: "public" skips it). 2. Rate limit. 3. Meter.
      let account: Account | null = null;
      if ((op.auth ?? "key") === "key") {
        const a = await resolveAccount(ctx, req);
        if (a instanceof Response) return a;
        account = a;
      }
      let charged = 0;
      if (account) {
        const limited = await checkRate(ctx, account, opId);
        if (limited) { await recordEvent(ctx, account.accountId, opId, 0, "rate_limited"); return limited; }
        const m = await meter(ctx, account, opId, op.costCents);
        if (m instanceof Response) { await recordEvent(ctx, account.accountId, opId, 0, "payment_required"); return m; }
        charged = m;
      }
      const refund = async () => {
        if (account && charged > 0)
          await ctx.runMutation(api.accounts.refundCredits, { accountId: account.accountId, amountCents: charged });
      };

      // 4. Validate input against the op's Zod schema.
      const raw = op.inputFrom === "query"
        ? Object.fromEntries(new URL(req.url).searchParams.entries())
        : await req.json().catch(() => ({}));
      const parsed = op.input.safeParse(raw);
      if (!parsed.success) { await refund(); return json({ error: "bad_request", message: parsed.error.message }, 400); }

      // 5. Dispatch — gateway op (inline) or port op (generic node invoke).
      try {
        let output: unknown;
        if ("gateway" in op.serve) {
          output = await gatewayHandlers[opId](ctx, account as Account, parsed.data);
        } else {
          output = await ctx.runAction(internal.invoke.invoke, {
            port: op.serve.port, method: op.serve.method, input: parsed.data,
          });
        }
        if (account) await recordEvent(ctx, account.accountId, opId, charged, "ok");
        return json(output);
      } catch (err) {
        await refund();
        if (account) await recordEvent(ctx, account.accountId, opId, 0, "error");
        return json({ error: "operation_error", message: (err as Error).message }, 409);
      }
    });
    router.route({ path: op.path, method: op.method, handler });
  }
}
