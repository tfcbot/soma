import { test, expect } from "bun:test";
import { Assistant, type Ports } from "./assistant";
import { TodoService } from "./todos";
import { IllegalTransitionError } from "../domain/todo";
import { BudgetExceededError } from "../domain/budget";
import { MockTodoStore } from "../../adapters/todo/mock";
import { MockPhone } from "../../adapters/phone/mock";
import { MockEmail } from "../../adapters/email/mock";
import { MockWallet } from "../../adapters/wallet/mock";
import { MockSandbox } from "../../adapters/sandbox/mock";
import { MockFileSystem } from "../../adapters/filesystem/mock";

function rig() {
  const todos = new MockTodoStore();
  const phone = new MockPhone();
  const email = new MockEmail();
  const wallet = new MockWallet();
  const sandbox = new MockSandbox();
  const filesystem = new MockFileSystem();
  const ports: Ports = { todos, phone, email, wallet, sandbox, filesystem };
  return { ports, svc: new TodoService(todos), assistant: new Assistant(ports), phone, email, wallet, sandbox, filesystem };
}

async function toQa(svc: TodoService, id: string) {
  for (const st of ["accepted", "in_production", "qa"] as const) await svc.advance(id, st, "provider");
}

test("deliver: sandbox → filesystem(CDN) → todo delivered → email with attachment", async () => {
  const r = rig();
  const t = await r.svc.intake({ title: "Hero video", brief: "9:16" });
  await toQa(r.svc, t.id);
  const bytes = new Uint8Array([1, 2, 3, 4]);
  await r.sandbox.putFile("/out/hero.mp4", bytes);

  const result = await r.assistant.deliver(t.id, "/out/hero.mp4", "hero.mp4", "client@example.com");

  const url = `mock://delivered/${t.id}/hero.mp4`;
  expect(result.state).toBe("delivered");
  expect(result.artifacts).toContain(url);
  expect(await r.filesystem.read(`delivered/${t.id}/hero.mp4`)).toEqual(bytes);
  expect(r.email.sent).toHaveLength(1);
  expect(r.email.sent[0]!.to).toBe("client@example.com");
  expect(r.email.sent[0]!.attachments?.[0]?.url).toBe(url);
});

test("deliver: missing artifact in the sandbox throws", async () => {
  const r = rig();
  const t = await r.svc.intake({ title: "x", brief: "y" });
  await toQa(r.svc, t.id);
  await expect(r.assistant.deliver(t.id, "/nope.mp4", "nope.mp4", "c@e.com")).rejects.toThrow(
    "No artifact",
  );
  expect(r.email.sent).toHaveLength(0);
});

test("deliver: from a non-qa state is an illegal transition", async () => {
  const r = rig();
  const t = await r.svc.intake({ title: "x", brief: "y" }); // still `requested`
  await r.sandbox.putFile("/out/x.mp4", new Uint8Array([9]));
  await expect(r.assistant.deliver(t.id, "/out/x.mp4", "x.mp4", "c@e.com")).rejects.toThrow(
    IllegalTransitionError,
  );
});

test("fundCard: within budget issues a card, debits the envelope, and texts a notice", async () => {
  const r = rig();
  const t = await r.svc.intake({
    title: "Ads",
    brief: "x",
    budget: { authorized: 300, spent: 0, currency: "USD" },
  });
  const { todo, card } = await r.assistant.fundCard(t.id, 20000, "stock footage", "+15555550123");
  expect(card.spendLimitCents).toBe(20000);
  expect(todo.budget?.spent).toBe(200);
  expect(r.wallet.issued).toHaveLength(1);
  expect(r.phone.sent).toHaveLength(1);
});

test("fundCard: over the envelope is refused before any card is issued", async () => {
  const r = rig();
  const t = await r.svc.intake({
    title: "Ads",
    brief: "x",
    budget: { authorized: 300, spent: 0, currency: "USD" },
  });
  await expect(r.assistant.fundCard(t.id, 40000, "too much")).rejects.toThrow(BudgetExceededError);
  expect(r.wallet.issued).toHaveLength(0); // refused before issuing
});

test("fundCard: a todo with no budget envelope throws", async () => {
  const r = rig();
  const t = await r.svc.intake({ title: "x", brief: "y" });
  await expect(r.assistant.fundCard(t.id, 100, "x")).rejects.toThrow("no budget envelope");
});
