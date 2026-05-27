# AGENTS.md — extending & maintaining Soma

Soma is a **headless contract for agents that do work**: five primitives (phone, email, wallet,
computer, storage) exposed through one metered gateway. The contract is a **typed Zod registry**
assembled from **self-contained capability modules**. The server router, SDK, CLI, MCP tools, and
OpenAPI spec all derive from it. No codegen — in this monorepo, shared types give end-to-end safety.

## Where things live
```
modules/<name>/        a self-contained capability — EVERYTHING for it lives here:
  operations.ts          its Zod schemas + ops (registry slice) + its port interface
  <vendor>.ts            the real adapter (implements the port interface)
  mock.ts                the mock adapter
  server.ts              buildX(env): Port — real adapter if env keys present, else mock
packages/contract/src/ op.ts (the op() helper), schemas.ts (shared Base64), and the AGGREGATORS:
  operations.ts          merges every module's ops → `operations` (the registry)
  ports.ts               assembles the `Ports` bag + a compile-time serve→ports guard
convex/  gateway.ts         builds every route from the registry (auth→429→402→dispatch→event)
         invoke.ts          ONE generic node action — calls the right port adapter method
         ports.ts           buildPorts(env) — aggregates each module's server.ts factory
         gatewayHandlers.ts the few DB-backed ops (balance, events)
         accounts.ts / ratelimit.ts / events.ts / auth.ts / http.ts / schema.ts
packages/{sdk,cli,mcp}/  derived from the contract (no codegen)
```

## Recipe: add a capability `xyz` (vendor-backed)
Everything for the capability goes in **one folder**; then 3 one-line registrations. You never
edit `gateway.ts`, `invoke.ts`, or `http.ts`.

1. **Create `modules/xyz/operations.ts`** — schemas + ops + the port interface, self-contained:
   ```ts
   import { z } from "zod";
   import { op } from "../../packages/contract/src/op";
   const doIn = z.object({ thing: z.string() });
   const doOut = z.object({ id: z.string() });
   export const ops = {
     xyzDo: op({ method: "POST", path: "/v1/xyz/do", inputFrom: "body",
       input: doIn, output: doOut, costCents: 5, summary: "Do the xyz thing",
       serve: { port: "xyz", method: "do" } }),   // typo here ⇒ tsc error (guard in ports.ts)
   };
   export interface XyzPort { do(input: z.infer<typeof doIn>): Promise<z.infer<typeof doOut>>; }
   ```
2. **`modules/xyz/xyzvendor.ts` + `modules/xyz/mock.ts`** — `implements XyzPort` (mismatch ⇒ tsc error).
3. **`modules/xyz/server.ts`** — `export function buildXyz(env) { return env.XYZ_API_KEY ? new XyzVendor(...) : new MockXyz(); }`.
4. **Register (3 one-liners):**
   - `packages/contract/src/operations.ts`: `import { ops as xyz } from "../../../modules/xyz/operations"` + spread `...xyz`.
   - `packages/contract/src/ports.ts`: import `XyzPort` + add `xyz: XyzPort` to `Ports`.
   - `convex/ports.ts`: `import { buildXyz } from "../modules/xyz/server"` + `xyz: buildXyz(env)`.
5. If the real adapter needs a vendor SDK: add it to `convex.json` `node.externalPackages` + `bun add`.
6. `bunx convex dev` to deploy.

The route (auth + metering + events), `soma.xyzDo(...)`, the MCP tool, the CLI command, and the
OpenAPI entry all appear automatically.

**No-vendor variant (DB-backed, like `balance`/`events`):** put the op in `modules/account/operations.ts`
with `serve: { gateway: true }` and add one handler to `convex/gatewayHandlers.ts`. No port/adapter.

## Import rule (read once)
The Convex bundler can't resolve the workspace package name, so:
- **Published packages** (`packages/sdk|cli|mcp`): `import … from "@soma/contract"`.
- **Convex host** (`convex/*`): `import … from "../packages/contract/src/index"`; modules via `../modules/...`.
- **Inside a module**: import `op`/`Base64` from `../../packages/contract/src/...`; adapters import the
  port interface from `./operations` (the same folder).

## Compile-time guards
- `serve` must name a real `Ports` method — assertion in `packages/contract/src/ports.ts`.
- Each adapter `implements <Port>` — can't drift from the registry's input/output.

## Verify
```bash
bun run typecheck                                                        # core + modules + contract
bun test                                                                 # domain + mock adapters
CONVEX_AGENT_MODE=anonymous bunx convex dev --once --typecheck enable     # full convex codegen+typecheck
bun scripts/gen-openapi.ts                                               # re-emit spec/openapi/spec.json
(cd packages/sdk && bun run build) && (cd packages/cli && bun run build) && (cd packages/mcp && bun run build)
```

## Do NOT
- Edit `gateway.ts` / `invoke.ts` / `http.ts` to add an op — they're generic.
- Log `pan`/`cvv` from the wallet (sensitive).
- Reach the credit-grant seam (`accounts:grantCredits`) from a caller-facing route.
