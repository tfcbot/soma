# AGENTS.md — extending & maintaining Soma

Soma is a **headless contract for agents that do work**: five primitives (phone, email, wallet,
computer, storage) exposed through one metered gateway. The contract is a **typed Zod registry**
(`packages/contract/src/operations.ts`) — the single source of truth. The server router, SDK, CLI,
MCP tools, and OpenAPI spec all derive from it. There is **no codegen**: in this monorepo, shared
types give end-to-end safety.

## Where things live
```
packages/contract/  the registry (operations.ts) + port interfaces (ports.ts)  ← source of truth
adapters/<port>/    one real adapter + one mock per primitive (typed from the contract)
convex/  gateway.ts         builds every route from the registry (auth→429→402→dispatch→event)
         invoke.ts          ONE generic node action — calls the right port adapter method
         ports.ts           the port registry: real adapter if env keys present, else mock
         gatewayHandlers.ts the few DB-backed ops (balance, events)
         accounts.ts / ratelimit.ts / events.ts / auth.ts / http.ts / schema.ts
packages/{sdk,cli,mcp}/     derived from the contract (no codegen)
```

## Recipe: add a capability `/v1/xyz/...` (vendor-backed)
You touch **4 places**; you never edit `gateway.ts`, `invoke.ts`, or `http.ts`.

1. **Registry** — add the op(s) to `packages/contract/src/operations.ts`:
   ```ts
   xyzDo: op({
     method: "POST", path: "/v1/xyz/do", inputFrom: "body",   // GET ⇒ inputFrom: "query"
     input: z.object({ thing: z.string() }),
     output: z.object({ id: z.string() }),
     costCents: 5, summary: "Do the xyz thing",
     serve: { port: "xyz", method: "do" },                    // a typo here is a tsc error
   }),
   ```
2. **Port interface** — in `packages/contract/src/ports.ts`, add the interface and put it in `Ports`:
   ```ts
   export interface XyzPort { do(input: Input<"xyzDo">): Promise<Output<"xyzDo">>; }
   export interface Ports { /* … */ xyz: XyzPort; }
   ```
3. **Adapter(s)** — `adapters/xyz/xyzvendor.ts` (+ `adapters/xyz/mock.ts`) implementing `XyzPort`:
   ```ts
   import type { XyzPort, Input, Output } from "../../packages/contract/src/index";
   export class XyzVendor implements XyzPort {
     constructor(private apiKey: string) {}
     async do(input: Input<"xyzDo">): Promise<Output<"xyzDo">> { /* call the vendor */ }
   }
   ```
   The `implements XyzPort` makes a signature mismatch a compile error.
4. **Register the port** — one line in `convex/ports.ts` `buildPorts`:
   ```ts
   xyz: env.XYZ_API_KEY ? new XyzVendor(env.XYZ_API_KEY) : new MockXyz(),
   ```
5. If the real adapter needs a vendor SDK: add it to `convex.json` `node.externalPackages` + `bun add`.
6. `bunx convex dev` to deploy.

That's it. The route (with auth + metering + events), `soma.xyzDo(...)` in the SDK, the `xyzDo`
MCP tool, the `xyzDo` CLI command, and the OpenAPI entry all appear automatically.

**Variant — a capability with no vendor (reads the DB, like `balance`/`events`):** skip steps 2–5;
set `serve: { gateway: true }` and add one handler to `convex/gatewayHandlers.ts`.

## Import rule (read this once)
Importing the contract differs by where the code runs — the Convex bundler can't resolve the
workspace package name, so:
- **Published packages** (`packages/sdk|cli|mcp`): `import … from "@soma/contract"`.
- **The Convex host** (`convex/*`): `import … from "../packages/contract/src/index"`.
- **Adapters** (`adapters/<port>/*`): `import … from "../../packages/contract/src/index"`.

## Two guards that catch mistakes at compile time
- Each op's `serve` must name a real `Ports` method — enforced by an assertion in
  `packages/contract/src/ports.ts` (`tsc` names the offending op if you typo `port`/`method`).
- An adapter must `implements <Port>` — so it can't drift from the registry's input/output.

## Verify
```bash
bun run typecheck                          # core hexagon + contract
bun test                                   # domain (credits, ratelimit) + mock adapters
CONVEX_AGENT_MODE=anonymous bunx convex dev --once --typecheck enable   # full convex codegen+typecheck
bun scripts/gen-openapi.ts                 # re-emit spec/openapi/spec.json from the registry
(cd packages/sdk && bun run build) && (cd packages/cli && bun run build) && (cd packages/mcp && bun run build)
```
Live smoke: run `convex dev`, mint a key (`bunx convex run accounts:mintKey '{"creditsCents":1000}'`),
then call your endpoint with `Authorization: Bearer <key>`.

## Do NOT
- Edit `gateway.ts` / `invoke.ts` / `http.ts` to add an op — they're generic.
- Add a per-op node action or handler for a vendor op — the generic dispatcher covers it.
- Log `pan`/`cvv` from the wallet (sensitive).
- Reach the credit-grant seam (`accounts:grantCredits`) from a caller-facing route.
