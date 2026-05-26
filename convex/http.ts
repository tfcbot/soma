import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { requireApiKey, json } from "./auth";
import { buildPorts } from "./composition";
import { Assistant } from "../core/services/assistant";
import type { TodoState } from "../core/domain/todo";

const router = httpRouter();

// POST /v1/todo — the one client write: intake. Creates a todo in `requested`.
const createTodo = httpAction(async (ctx, req) => {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const body = (await req.json()) as {
    title?: string;
    brief?: string;
    channelOrigin?: string;
    budget?: { authorized: number; spent: number; currency: string };
  };
  if (!body.title || !body.brief) {
    return json({ error: "bad_request", message: "title and brief are required" }, 400);
  }
  const assistant = new Assistant(buildPorts(ctx));
  const todo = await assistant.intake({
    title: body.title,
    brief: body.brief,
    channelOrigin: body.channelOrigin,
    budget: body.budget,
  });
  return json(todo, 201);
});

// GET /v1/todo — list all work state.
const listTodos = httpAction(async (ctx, req) => {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const assistant = new Assistant(buildPorts(ctx));
  return json(await assistant.listTodos());
});

// GET /v1/todo/{id}
const getTodo = httpAction(async (ctx, req) => {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const id = new URL(req.url).pathname.split("/").pop() ?? "";
  const assistant = new Assistant(buildPorts(ctx));
  const todo = await assistant.getTodo(id);
  return todo ? json(todo) : json({ error: "not_found", id }, 404);
});

// POST /v1/todo/{id}/comment  (revise note)  and  POST /v1/todo/{id}/advance  (state change)
const mutateTodo = httpAction(async (ctx, req) => {
  const denied = requireApiKey(req);
  if (denied) return denied;
  const parts = new URL(req.url).pathname.split("/").filter(Boolean); // [v1, todo, {id}, action]
  const id = parts[2] ?? "";
  const action = parts[3] ?? "";
  const body = (await req.json().catch(() => ({}))) as { note?: string; to?: TodoState };
  const assistant = new Assistant(buildPorts(ctx));
  try {
    if (action === "comment") {
      if (!body.note) return json({ error: "bad_request", message: "note required" }, 400);
      return json(await assistant.comment(id, body.note));
    }
    if (action === "advance") {
      if (!body.to) return json({ error: "bad_request", message: "to (state) required" }, 400);
      return json(await assistant.advance(id, body.to, "provider"));
    }
    return json({ error: "not_found", message: `unknown action: ${action}` }, 404);
  } catch (err) {
    return json({ error: "transition_error", message: (err as Error).message }, 409);
  }
});

router.route({ path: "/v1/todo", method: "POST", handler: createTodo });
router.route({ path: "/v1/todo", method: "GET", handler: listTodos });
router.route({ pathPrefix: "/v1/todo/", method: "GET", handler: getTodo });
router.route({ pathPrefix: "/v1/todo/", method: "POST", handler: mutateTodo });

export default router;
