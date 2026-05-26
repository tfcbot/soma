import { test, expect } from "bun:test";
import { remaining, applyCharge, BudgetExceededError, type BudgetEnvelope } from "./budget";

const env = (): BudgetEnvelope => ({ authorized: 300, spent: 50, currency: "USD" });

test("remaining is authorized minus spent", () => {
  expect(remaining(env())).toBe(250);
});

test("applyCharge within budget increments spent and is immutable", () => {
  const before = env();
  const after = applyCharge(before, 100);
  expect(after.spent).toBe(150);
  expect(before.spent).toBe(50); // original untouched
});

test("applyCharge up to the exact remaining is allowed", () => {
  expect(applyCharge(env(), 250).spent).toBe(300);
});

test("applyCharge over the ceiling throws BudgetExceededError", () => {
  expect(() => applyCharge(env(), 251)).toThrow(BudgetExceededError);
});
