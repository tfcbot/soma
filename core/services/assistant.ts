import type { Todo } from "../domain/todo";
import { applyCharge } from "../domain/budget";
import type { TodoStore } from "../ports/todo";
import type { Phone } from "../ports/phone";
import type { Email } from "../ports/email";
import type { Wallet, IssuedCard } from "../ports/wallet";
import type { Sandbox } from "../ports/sandbox";
import type { FileSystem } from "../ports/filesystem";
import { TodoService } from "./todos";

// The composition root injects one adapter (real or mock) per port.
export interface Ports {
  todos: TodoStore;
  phone: Phone;
  email: Email;
  wallet: Wallet;
  sandbox: Sandbox;
  filesystem: FileSystem;
}

// Vendor-touching orchestration. Runs in the Node runtime (it instantiates vendor SDKs).
// Todo-only ops live in TodoService and run anywhere.
export class Assistant {
  private readonly svc: TodoService;

  constructor(private readonly ports: Ports) {
    this.svc = new TodoService(ports.todos);
  }

  // The cross-primitive flow: pull a produced artifact out of the SANDBOX, persist it to the
  // public FILESYSTEM (→ CDN url), advance the TODO to delivered, and notify by EMAIL.
  async deliver(id: string, sandboxPath: string, filename: string, to: string): Promise<Todo> {
    const bytes = await this.ports.sandbox.getFile(sandboxPath);
    if (!bytes) throw new Error(`No artifact in sandbox at ${sandboxPath}`);

    const { url } = await this.ports.filesystem.write(`delivered/${id}/${filename}`, bytes, {
      public: true,
    });

    const delivered = await this.svc.advance(id, "delivered", "provider"); // validates qa → delivered
    const withArtifact: Todo = {
      ...delivered,
      artifacts: [...delivered.artifacts, url ?? `fs://delivered/${id}/${filename}`],
      updatedAt: Date.now(),
    };
    await this.ports.todos.save(withArtifact);

    await this.ports.email.send({
      to,
      subject: `Delivered: ${delivered.title}`,
      body: "Your asset is ready — attached.",
      attachments: url ? [{ filename, url }] : [],
    });
    return withArtifact;
  }

  // Provision a prepaid card for a todo, within its authorized budget envelope (the prepaid
  // limit is the ceiling). Notify by SMS that funds are ready, if a number is supplied.
  async fundCard(
    id: string,
    amountCents: number,
    memo: string,
    notify?: string,
  ): Promise<{ todo: Todo; card: IssuedCard }> {
    const todo = await this.svc.requireTodo(id);
    if (!todo.budget) throw new Error(`Todo ${id} has no budget envelope`);
    const nextBudget = applyCharge(todo.budget, amountCents / 100);
    const card = await this.ports.wallet.issueCard({ amountCents, memo });
    const saved = await this.ports.todos.save({ ...todo, budget: nextBudget, updatedAt: Date.now() });
    if (notify) {
      await this.ports.phone.sendSms(notify, `Card issued for "${todo.title}" (••${card.last4 ?? ""}).`);
    }
    return { todo: saved, card };
  }
}
