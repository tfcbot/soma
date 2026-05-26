import type { Todo, TodoState } from "../domain/todo";
import { assertTransition } from "../domain/todo";
import type { TodoStore, NewTodo } from "../ports/todo";

// Todo-only use-cases. Touches no vendor — safe to run in any runtime (used by the HTTP
// endpoints directly). Vendor-touching orchestration lives in Assistant (Node runtime).
export class TodoService {
  constructor(private readonly todos: TodoStore) {}

  intake(input: NewTodo): Promise<Todo> {
    return this.todos.create(input);
  }

  list(): Promise<Todo[]> {
    return this.todos.list();
  }

  get(id: string): Promise<Todo | null> {
    return this.todos.get(id);
  }

  async advance(id: string, to: TodoState, actor: string): Promise<Todo> {
    const todo = await this.requireTodo(id);
    assertTransition(todo.state, to);
    const now = Date.now();
    const next: Todo = {
      ...todo,
      state: to,
      updatedAt: now,
      history: [...todo.history, { state: to, ts: now, actor }],
    };
    return this.todos.save(next);
  }

  async comment(id: string, note: string): Promise<Todo> {
    const todo = await this.requireTodo(id);
    const advanced =
      todo.state === "delivered" ? await this.advance(id, "revise", "client") : todo;
    const noted: Todo = {
      ...advanced,
      brief: `${advanced.brief}\n\n[revise] ${note}`,
      updatedAt: Date.now(),
    };
    return this.todos.save(noted);
  }

  async requireTodo(id: string): Promise<Todo> {
    const todo = await this.todos.get(id);
    if (!todo) throw new Error(`Todo not found: ${id}`);
    return todo;
  }
}
