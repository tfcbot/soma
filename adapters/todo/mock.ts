import type { Todo } from "../../core/domain/todo";
import type { TodoStore, NewTodo } from "../../core/ports/todo";

// In-memory TodoStore. Used for local/mock mode and unit tests.
// The real, persistent store is Convex DB (see convex/adapters/todoStore.ts).
export class MockTodoStore implements TodoStore {
  private readonly byId = new Map<string, Todo>();

  async create(input: NewTodo): Promise<Todo> {
    const now = Date.now();
    const todo: Todo = {
      id: `td_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
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
    this.byId.set(todo.id, todo);
    return todo;
  }

  async get(id: string): Promise<Todo | null> {
    return this.byId.get(id) ?? null;
  }

  async list(): Promise<Todo[]> {
    return [...this.byId.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  async save(todo: Todo): Promise<Todo> {
    this.byId.set(todo.id, todo);
    return todo;
  }
}
