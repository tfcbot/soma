import { expect, test } from "bun:test";
import { windowStart, retryAfterSeconds, exceeds } from "./ratelimit";

const WIN = 60_000;

test("windowStart floors to the window boundary", () => {
  expect(windowStart(60_000, WIN)).toBe(60_000);
  expect(windowStart(90_000, WIN)).toBe(60_000);
  expect(windowStart(119_999, WIN)).toBe(60_000);
});

test("retryAfterSeconds counts to the next window boundary", () => {
  expect(retryAfterSeconds(60_000, WIN)).toBe(60); // just opened
  expect(retryAfterSeconds(90_000, WIN)).toBe(30); // halfway
});

test("exceeds refuses once the recorded count reaches the limit", () => {
  const rule = { limit: 3, windowMs: WIN };
  expect(exceeds(0, rule)).toBe(false);
  expect(exceeds(2, rule)).toBe(false); // 3rd call (count 2 before) allowed
  expect(exceeds(3, rule)).toBe(true); // 4th call refused
});
