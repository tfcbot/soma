import type { Todo } from "../../core/domain/todo";
import type { TodoStore, NewTodo } from "../../core/ports/todo";
import { api } from "../_generated/api";
import type { ActionCtx } from "../_generated/server";

// The real, persistent TodoStore — Convex DB behind core's TodoPort. Lives in convex/ (not
// top-level adapters/) because it needs the Convex ctx, which only exists inside actions.

type TodoDoc = Omit<Todo, "id"> & { todoId: string };

function toDoc(todo: Todo): TodoDoc {
  const { id, ...rest } = todo;
  return { ...rest, todoId: id };
}

// Convex returns docs with _id / _creationTime; strip them back to the domain shape.
function fromDoc(doc: Record<string, unknown>): Todo {
  const { todoId, ...rest } = doc as TodoDoc & { _id?: unknown; _creationTime?: unknown };
  delete (rest as Record<string, unknown>)._id;
  delete (rest as Record<string, unknown>)._creationTime;
  return { ...(rest as Omit<Todo, "id">), id: todoId };
}

function newId(): string {
  return `td_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

export function convexTodoStore(ctx: ActionCtx): TodoStore {
  return {
    async create(input: NewTodo): Promise<Todo> {
      const now = Date.now();
      const todo: Todo = {
        id: newId(),
        title: input.title,
        brief: input.brief,
        channelOrigin: input.channelOrigin,
        budget: input.budget,
        state: "requested",
        artifacts: [],
        history: [{ state: "requested", ts: now, actor: input.channelOrigin ?? "client" }],
        createdAt: now,
        updatedAt: now,
      };
      await ctx.runMutation(api.todos.upsert, { doc: toDoc(todo) });
      return todo;
    },

    async get(id: string): Promise<Todo | null> {
      const doc = await ctx.runQuery(api.todos.getByTodoId, { todoId: id });
      return doc ? fromDoc(doc as Record<string, unknown>) : null;
    },

    async list(): Promise<Todo[]> {
      const docs = (await ctx.runQuery(api.todos.listAll, {})) as Record<string, unknown>[];
      return docs.map(fromDoc).sort((a, b) => b.createdAt - a.createdAt);
    },

    async save(todo: Todo): Promise<Todo> {
      await ctx.runMutation(api.todos.upsert, { doc: toDoc(todo) });
      return todo;
    },
  };
}
