import { test, expect } from "bun:test";
import { TodoService } from "./todos";
import { IllegalTransitionError } from "../domain/todo";
import { MockTodoStore } from "../../adapters/todo/mock";

function svc() {
  return new TodoService(new MockTodoStore());
}

test("intake creates a todo in `requested` with one history entry", async () => {
  const s = svc();
  const t = await s.intake({ title: "Ad 1", brief: "9:16", channelOrigin: "sms" });
  expect(t.state).toBe("requested");
  expect(t.id).toMatch(/^td_/);
  expect(t.history).toHaveLength(1);
  expect(t.history[0]!.actor).toBe("sms");
});

test("list returns created todos; get fetches by id", async () => {
  const s = svc();
  const a = await s.intake({ title: "A", brief: "x" });
  await s.intake({ title: "B", brief: "y" });
  expect(await s.list()).toHaveLength(2);
  expect((await s.get(a.id))?.title).toBe("A");
  expect(await s.get("td_missing")).toBeNull();
});

test("advance walks the legal path and records history + actor", async () => {
  const s = svc();
  const t = await s.intake({ title: "A", brief: "x" });
  await s.advance(t.id, "accepted", "provider");
  const inProd = await s.advance(t.id, "in_production", "provider");
  expect(inProd.state).toBe("in_production");
  expect(inProd.history.map((h) => h.state)).toEqual(["requested", "accepted", "in_production"]);
});

test("advance rejects an illegal transition", async () => {
  const s = svc();
  const t = await s.intake({ title: "A", brief: "x" });
  await expect(s.advance(t.id, "delivered", "provider")).rejects.toThrow(IllegalTransitionError);
});

test("comment on a delivered todo bounces it to revise and appends the note", async () => {
  const s = svc();
  const t = await s.intake({ title: "A", brief: "original" });
  for (const st of ["accepted", "in_production", "qa", "delivered"] as const) {
    await s.advance(t.id, st, "provider");
  }
  const revised = await s.comment(t.id, "punch up the hook");
  expect(revised.state).toBe("revise");
  expect(revised.brief).toContain("original");
  expect(revised.brief).toContain("[revise] punch up the hook");
});

test("comment on a non-delivered todo just appends the note, no state change", async () => {
  const s = svc();
  const t = await s.intake({ title: "A", brief: "x" });
  const commented = await s.comment(t.id, "note");
  expect(commented.state).toBe("requested");
  expect(commented.brief).toContain("[revise] note");
});

test("requireTodo throws on a missing id", async () => {
  await expect(svc().requireTodo("td_nope")).rejects.toThrow("Todo not found");
});
