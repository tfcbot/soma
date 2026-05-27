import { test, expect } from "bun:test";
import { MockFileSystem } from "./filesystem/mock";
import { MockSandbox } from "./sandbox/mock";

const b64 = (s: string) => Buffer.from(s).toString("base64");
const dec = (s: string | null) => (s ? Buffer.from(s, "base64").toString() : null);

test("MockFileSystem: public write returns a CDN url; read/list round-trip (base64)", async () => {
  const fs = new MockFileSystem();
  const pub = await fs.write({ path: "delivered/x/a.mp4", data: b64("hi"), public: true });
  expect(pub.url).toBe("mock://delivered/x/a.mp4");
  await fs.write({ path: "wip/b.txt", data: b64("hello") });
  expect(dec((await fs.read({ path: "wip/b.txt" })).data)).toBe("hello");
  expect((await fs.list({ prefix: "delivered/" })).paths).toEqual(["delivered/x/a.mp4"]);
});

test("MockSandbox: exec recorded; putFile/getFile round-trip (base64); dispose clears", async () => {
  const sb = new MockSandbox();
  await sb.exec({ command: "echo hi" });
  expect(sb.commands).toEqual(["echo hi"]);
  await sb.putFile({ path: "/t.bin", data: b64("AB") });
  expect(dec((await sb.getFile({ path: "/t.bin" })).data)).toBe("AB");
  await sb.dispose();
  expect(sb.disposed).toBe(true);
  expect((await sb.getFile({ path: "/t.bin" })).data).toBeNull();
});
