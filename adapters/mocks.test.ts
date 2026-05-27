import { test, expect } from "bun:test";
import { MockFileSystem } from "./filesystem/mock";
import { MockSandbox } from "./sandbox/mock";

// The mock adapters double as test doubles, so verify they honor their port contracts.

test("MockFileSystem: public write returns a CDN url; read/list work", async () => {
  const fs = new MockFileSystem();
  const pub = await fs.write("delivered/x/a.mp4", new Uint8Array([1]), { public: true });
  expect(pub.url).toBe("mock://delivered/x/a.mp4");
  const priv = await fs.write("wip/b.txt", "hello");
  expect(priv.url).toBeUndefined();
  expect(await fs.read("wip/b.txt")).toEqual(new TextEncoder().encode("hello"));
  expect(await fs.list("delivered/")).toEqual(["delivered/x/a.mp4"]);
});

test("MockSandbox: exec is recorded; putFile/getFile round-trip; dispose clears", async () => {
  const sb = new MockSandbox();
  await sb.exec("echo hi");
  expect(sb.commands).toEqual(["echo hi"]);
  await sb.putFile("/t.bin", new Uint8Array([7, 8]));
  expect(await sb.getFile("/t.bin")).toEqual(new Uint8Array([7, 8]));
  await sb.dispose();
  expect(sb.disposed).toBe(true);
  expect(await sb.getFile("/t.bin")).toBeNull();
});
