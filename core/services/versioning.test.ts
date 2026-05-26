import { test, expect } from "bun:test";
import { Versioning } from "./versioning";
import { MockSandbox } from "../../adapters/sandbox/mock";

test("git commands run in the sandbox: init → wip branch", async () => {
  const sb = new MockSandbox();
  await new Versioning(sb).init();
  expect(sb.commands[0]).toContain("git init");
  expect(sb.commands[0]).toContain("checkout -q -b wip");
});

test("commit stages and commits with the message", async () => {
  const sb = new MockSandbox();
  await new Versioning(sb).commit("first commit");
  const cmd = sb.commands.at(-1)!;
  expect(cmd).toContain("git add -A");
  expect(cmd).toContain("git commit");
  expect(cmd).toContain("'first commit'");
});

test("commit message with a single quote is shell-escaped", async () => {
  const sb = new MockSandbox();
  await new Versioning(sb).commit("it's a fix");
  expect(sb.commands.at(-1)!).toContain("'it'\\''s a fix'");
});

test("deliver merges wip into delivered; diff runs against the ref", async () => {
  const sb = new MockSandbox();
  const v = new Versioning(sb);
  await v.deliver();
  expect(sb.commands.at(-1)!).toContain("git merge -q wip");
  await v.diff("HEAD~2");
  expect(sb.commands.at(-1)!).toContain("git diff 'HEAD~2'");
});
