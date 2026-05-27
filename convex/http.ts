import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { json, paymentRequired, rateLimited, resolveAccount, type Account } from "./auth";
import { convexTodoStore } from "./adapters/todoStore";
import { TodoService } from "../core/services/todos";
import type { TodoState } from "../core/domain/todo";
import { costOf } from "../core/domain/pricing";

// Todo endpoints run in the isolate runtime (no vendor SDKs). Vendor ops (deliver, fund)
// delegate to the Node-runtime actions in node.ts via ctx.runAction.
const router = httpRouter();

type Ctx = Parameters<Parameters<typeof httpAction>[0]>[0];

function topupUrl(accountId: string): string {
  const base = process.env.SOMA_TOPUP_URL ?? "https://soma.example/topup";
  return `${base}?account=${encodeURIComponent(accountId)}`;
}

// Rate limit (abuse protection, SPEC §7.5). OFF unless the operator sets SOMA_RATE_LIMIT_PER_MIN.
// Returns a 429 Response when over the per-(account, operation) per-minute limit, else null.
async function checkRate(ctx: Ctx, account: Account, operationId: string): Promise<Response | null> {
  const perMin = Number(process.env.SOMA_RATE_LIMIT_PER_MIN ?? 0);
  if (!perMin) return null;
  const res = await ctx.runMutation(api.ratelimit.consume, {
    bucket: `${account.accountId}:${operationId}`,
    limit: perMin,
    windowMs: 60_000,
  });
  return res.allowed ? null : rateLimited(res.retryAfter ?? 60, res.limit);
}

// Meter a billable operation against the account's credit balance (SPEC §7.4). Returns the cents
// charged (0 for free ops) so the caller can refund on later failure, or a 402 Response.
async function meter(ctx: Ctx, account: Account, operationId: string): Promise<Response | number> {
  const cost = costOf(operationId);
  if (cost === 0) return 0;
  if (cost > account.creditsCents) {
    return paymentRequired(
      `Operation ${operationId} costs ${cost} credits; balance is ${account.creditsCents}.`,
      cost,
      account.creditsCents,
      topupUrl(account.accountId),
    );
  }
  try {
    await ctx.runMutation(api.accounts.debitCredits, { accountId: account.accountId, amountCents: cost });
    return cost;
  } catch {
    return paymentRequired(
      `Operation ${operationId} costs ${cost} credits; insufficient balance.`,
      cost,
      account.creditsCents,
      topupUrl(account.accountId),
    );
  }
}

// auth → rate limit (429) → meter (402). Returns cents charged, or a Response to short-circuit.
async function gate(ctx: Ctx, account: Account, operationId: string): Promise<Response | number> {
  const limited = await checkRate(ctx, account, operationId);
  if (limited) return limited;
  return meter(ctx, account, operationId);
}

// POST /v1/todo — intake (the one client write). Creates a todo in `requested`.
const createTodo = httpAction(async (ctx, req) => {
  const account = await resolveAccount(ctx, req);
  if (account instanceof Response) return account;
  const charged = await gate(ctx, account, "createTodo");
  if (charged instanceof Response) return charged;

  const body = (await req.json()) as {
    title?: string;
    brief?: string;
    channelOrigin?: string;
    budget?: { authorized: number; spent: number; currency: string };
  };
  if (!body.title || !body.brief) {
    if (charged > 0) await ctx.runMutation(api.accounts.refundCredits, { accountId: account.accountId, amountCents: charged });
    return json({ error: "bad_request", message: "title and brief are required" }, 400);
  }
  const svc = new TodoService(convexTodoStore(ctx));
  const todo = await svc.intake({
    title: body.title,
    brief: body.brief,
    channelOrigin: body.channelOrigin,
    budget: body.budget,
  });
  return json(todo, 201);
});

// GET /v1/todo — list all work state.
const listTodos = httpAction(async (ctx, req) => {
  const account = await resolveAccount(ctx, req);
  if (account instanceof Response) return account;
  const charged = await gate(ctx, account, "listTodos");
  if (charged instanceof Response) return charged;
  const svc = new TodoService(convexTodoStore(ctx));
  return json(await svc.list());
});

// GET /v1/todo/{id}
const getTodo = httpAction(async (ctx, req) => {
  const account = await resolveAccount(ctx, req);
  if (account instanceof Response) return account;
  const charged = await gate(ctx, account, "getTodo");
  if (charged instanceof Response) return charged;
  const id = new URL(req.url).pathname.split("/").pop() ?? "";
  const svc = new TodoService(convexTodoStore(ctx));
  const todo = await svc.get(id);
  return todo ? json(todo) : json({ error: "not_found", id }, 404);
});

// POST /v1/todo/{id}/{comment|advance|deliver|fund}
const mutateTodo = httpAction(async (ctx, req) => {
  const account = await resolveAccount(ctx, req);
  if (account instanceof Response) return account;

  const parts = new URL(req.url).pathname.split("/").filter(Boolean); // [v1, todo, {id}, action]
  const id = parts[2] ?? "";
  const action = parts[3] ?? "";
  const operationId =
    action === "comment" ? "commentTodo"
    : action === "advance" ? "advanceTodo"
    : action === "deliver" ? "deliverTodo"
    : action === "fund" ? "fundTodo"
    : "";
  if (!operationId) return json({ error: "not_found", message: `unknown action: ${action}` }, 404);

  const charged = await gate(ctx, account, operationId);
  if (charged instanceof Response) return charged;
  const refund = async () => {
    if (charged > 0) await ctx.runMutation(api.accounts.refundCredits, { accountId: account.accountId, amountCents: charged });
  };

  const body = (await req.json().catch(() => ({}))) as {
    note?: string;
    to?: TodoState;
    sandboxPath?: string;
    filename?: string;
    recipient?: string;
    amountCents?: number;
    memo?: string;
  };
  try {
    if (action === "comment") {
      if (!body.note) { await refund(); return json({ error: "bad_request", message: "note required" }, 400); }
      const svc = new TodoService(convexTodoStore(ctx));
      return json(await svc.comment(id, body.note));
    }
    if (action === "advance") {
      if (!body.to) { await refund(); return json({ error: "bad_request", message: "to (state) required" }, 400); }
      const svc = new TodoService(convexTodoStore(ctx));
      return json(await svc.advance(id, body.to, "provider"));
    }
    if (action === "deliver") {
      if (!body.sandboxPath || !body.filename || !body.recipient) {
        await refund();
        return json({ error: "bad_request", message: "sandboxPath, filename, recipient required" }, 400);
      }
      const result = await ctx.runAction(internal.node.deliver, {
        id,
        sandboxPath: body.sandboxPath,
        filename: body.filename,
        to: body.recipient,
      });
      return json(result);
    }
    if (action === "fund") {
      if (body.amountCents === undefined || !body.memo) {
        await refund();
        return json({ error: "bad_request", message: "amountCents, memo required" }, 400);
      }
      const result = await ctx.runAction(internal.node.fundCard, {
        id,
        amountCents: body.amountCents,
        memo: body.memo,
        notify: body.recipient,
      });
      return json(result);
    }
    await refund();
    return json({ error: "not_found", message: `unknown action: ${action}` }, 404);
  } catch (err) {
    await refund();
    return json({ error: "operation_error", message: (err as Error).message }, 409);
  }
});

// GET /v1/balance — the caller's credit balance.
const getBalanceRoute = httpAction(async (ctx, req) => {
  const account = await resolveAccount(ctx, req);
  if (account instanceof Response) return account;
  return json({
    accountId: account.accountId,
    creditsCents: account.creditsCents,
    spentCents: account.spentCents,
  });
});

router.route({ path: "/v1/todo", method: "POST", handler: createTodo });
router.route({ path: "/v1/todo", method: "GET", handler: listTodos });
router.route({ pathPrefix: "/v1/todo/", method: "GET", handler: getTodo });
router.route({ pathPrefix: "/v1/todo/", method: "POST", handler: mutateTodo });
router.route({ path: "/v1/balance", method: "GET", handler: getBalanceRoute });

export default router;
