import { test, expect } from "bun:test";
import { canTransition, assertTransition, IllegalTransitionError, type TodoState } from "./todo";

test("the happy path advances requested → … → delivered → approved", () => {
  const path: TodoState[] = [
    "requested",
    "accepted",
    "in_production",
    "qa",
    "delivered",
    "approved",
  ];
  for (let i = 0; i < path.length - 1; i++) {
    expect(canTransition(path[i]!, path[i + 1]!)).toBe(true);
  }
});

test("qa can bounce back to in_production", () => {
  expect(canTransition("qa", "in_production")).toBe(true);
});

test("delivered can be revised", () => {
  expect(canTransition("delivered", "revise")).toBe(true);
  expect(canTransition("revise", "in_production")).toBe(true);
});

test("illegal transitions are rejected", () => {
  expect(canTransition("requested", "delivered")).toBe(false);
  expect(canTransition("approved", "in_production")).toBe(false);
  expect(canTransition("qa", "approved")).toBe(false);
  expect(() => assertTransition("requested", "qa")).toThrow(IllegalTransitionError);
});

test("approved is terminal", () => {
  const targets: TodoState[] = [
    "requested",
    "accepted",
    "in_production",
    "qa",
    "delivered",
    "revise",
    "approved",
  ];
  for (const t of targets) expect(canTransition("approved", t)).toBe(false);
});
