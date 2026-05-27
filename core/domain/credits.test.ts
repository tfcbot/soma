import { expect, test } from "bun:test";
import { debit, grant, refund, InsufficientCreditsError, type CreditBalance } from "./credits";

const start: CreditBalance = { creditsCents: 100, spentCents: 0 };

test("debit subtracts from balance and accumulates spent", () => {
  const next = debit(start, 30);
  expect(next.creditsCents).toBe(70);
  expect(next.spentCents).toBe(30);
});

test("debit of the full balance is allowed", () => {
  expect(debit(start, 100).creditsCents).toBe(0);
});

test("debit beyond balance throws InsufficientCreditsError with required + balance", () => {
  try {
    debit(start, 101);
    throw new Error("should have thrown");
  } catch (e) {
    expect(e).toBeInstanceOf(InsufficientCreditsError);
    expect((e as InsufficientCreditsError).required).toBe(101);
    expect((e as InsufficientCreditsError).balance).toBe(100);
  }
});

test("debit is immutable — original balance is untouched", () => {
  debit(start, 50);
  expect(start.creditsCents).toBe(100);
});

test("grant (top-up) adds credits and leaves spent untouched", () => {
  const spent = { creditsCents: 0, spentCents: 30 };
  const topped = grant(spent, 50);
  expect(topped.creditsCents).toBe(50);
  expect(topped.spentCents).toBe(30); // a top-up does not reverse consumption
});

test("refund reverses a debit — restores credits AND reduces spent (floored at 0)", () => {
  const afterDebit = { creditsCents: 70, spentCents: 30 };
  const back = refund(afterDebit, 30);
  expect(back.creditsCents).toBe(100);
  expect(back.spentCents).toBe(0);
});
