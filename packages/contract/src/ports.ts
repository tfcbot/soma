import type { SandboxPort } from "../../../modules/sandbox/operations";
import type { FileSystemPort } from "../../../modules/filesystem/operations";
import type { Operations, OperationId } from "./operations";

// The bag of ports the generic dispatcher resolves against. Add a capability = one line here.
export interface Ports {
  sandbox: SandboxPort;
  filesystem: FileSystemPort;
}
export type PortName = keyof Ports;

// Compile-time guard: every op's serve {port, method} must name a real Ports method (or be a
// gateway op). A typo is a tsc error that names the offending op.
type ServeOk<K extends OperationId> = Operations[K]["serve"] extends { gateway: true }
  ? true
  : Operations[K]["serve"] extends { port: infer P; method: infer Me }
    ? P extends keyof Ports ? (Me extends keyof Ports[P] ? true : false) : false
    : false;
type BadServe = { [K in OperationId]: ServeOk<K> extends true ? never : K }[OperationId];
const _assertServe: [BadServe] extends [never]
  ? true
  : { ERROR: "serve does not match a Ports method"; offendingOps: BadServe } = true;
void _assertServe;
