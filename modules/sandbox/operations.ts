import { z } from "zod";
import { op } from "../../packages/contract/src/op";
import { Base64 } from "../../packages/contract/src/schemas";

const execIn = z.object({ command: z.string() });
const execOut = z.object({ stdout: z.string(), stderr: z.string(), exitCode: z.number() });
const putIn = z.object({ path: z.string(), data: Base64 });
const putOut = z.object({ path: z.string() });
const getIn = z.object({ path: z.string() });
const getOut = z.object({ data: Base64.nullable() });
const empty = z.object({});
const ok = z.object({ ok: z.boolean() });

export const ops = {
  sandboxExec: op({ method: "POST", path: "/v1/sandbox/exec", inputFrom: "body",
    input: execIn, output: execOut, costCents: 10, summary: "Run a command in the sandbox VM",
    serve: { port: "sandbox", method: "exec" } }),
  sandboxPutFile: op({ method: "PUT", path: "/v1/sandbox/files", inputFrom: "body",
    input: putIn, output: putOut, costCents: 2, summary: "Write a file into the sandbox",
    serve: { port: "sandbox", method: "putFile" } }),
  sandboxGetFile: op({ method: "GET", path: "/v1/sandbox/files", inputFrom: "query",
    input: getIn, output: getOut, costCents: 1, summary: "Read a file out of the sandbox",
    serve: { port: "sandbox", method: "getFile" } }),
  sandboxDispose: op({ method: "POST", path: "/v1/sandbox/dispose", inputFrom: "body",
    input: empty, output: ok, costCents: 0, summary: "Suspend/destroy the sandbox VM",
    serve: { port: "sandbox", method: "dispose" } }),
};

export interface SandboxPort {
  exec(input: z.infer<typeof execIn>): Promise<z.infer<typeof execOut>>;
  putFile(input: z.infer<typeof putIn>): Promise<z.infer<typeof putOut>>;
  getFile(input: z.infer<typeof getIn>): Promise<z.infer<typeof getOut>>;
  dispose(input: z.infer<typeof empty>): Promise<z.infer<typeof ok>>;
}
