import type { Todo, TodoState } from "../domain/todo";
import { assertTransition } from "../domain/todo";
import { applyCharge, type BudgetEnvelope } from "../domain/budget";
import type { TodoStore, NewTodo } from "../ports/todo";
import type { Phone } from "../ports/phone";
import type { Email } from "../ports/email";
import type { Wallet } from "../ports/wallet";
import type { Computer } from "../ports/computer";
import type { Storage } from "../ports/storage";

// The composition root injects one adapter (real or mock) per port.
export interface Ports {
  todos: TodoStore;
  phone: Phone;
  email: Email;
  wallet: Wallet;
  computer: Computer;
  storage: Storage;
}

// Use-cases that orchestrate the primitives. Pure of any vendor or host concern.
export class Assistant {
  constructor(private readonly ports: Ports) {}

  // The single client-side write: intake. Creates a todo in `requested`.
  intake(input: NewTodo): Promise<Todo> {
    return this.ports.todos.create(input);
  }

  listTodos(): Promise<Todo[]> {
    return this.ports.todos.list();
  }

  getTodo(id: string): Promise<Todo | null> {
    return this.ports.todos.get(id);
  }

  // Provider-side: drive the lifecycle, validating each edge against the state machine.
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
    return this.ports.todos.save(next);
  }

  // A client revise note bounces a delivered todo back into rework.
  async comment(id: string, note: string): Promise<Todo> {
    const todo = await this.requireTodo(id);
    const advanced =
      todo.state === "delivered" ? await this.advance(id, "revise", "client") : todo;
    const noted: Todo = {
      ...advanced,
      brief: `${advanced.brief}\n\n[revise] ${note}`,
      updatedAt: Date.now(),
    };
    return this.ports.todos.save(noted);
  }

  // Charge the wallet against a todo's budget envelope (refuses if it breaches the ceiling).
  async spend(id: string, amount: number, memo: string): Promise<Todo> {
    const todo = await this.requireTodo(id);
    if (!todo.budget) throw new Error(`Todo ${id} has no budget envelope`);
    const nextBudget: BudgetEnvelope = applyCharge(todo.budget, amount);
    const charge = await this.ports.wallet.charge({
      amount,
      currency: todo.budget.currency,
      memo,
    });
    if (!charge.ok) throw new Error(`Wallet charge failed: ${charge.id}`);
    return this.ports.todos.save({ ...todo, budget: nextBudget, updatedAt: Date.now() });
  }

  private async requireTodo(id: string): Promise<Todo> {
    const todo = await this.ports.todos.get(id);
    if (!todo) throw new Error(`Todo not found: ${id}`);
    return todo;
  }
}
