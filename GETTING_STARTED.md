# Getting Started

Run the single-node reference implementation (SPEC.md §16): a hexagonal core fronted by an
API-key-protected Convex backend. It runs **end-to-end on mock adapters with zero vendor keys**
— connect real providers one at a time as you go.

## Prerequisites

- [Bun](https://bun.sh)
- **Node 22** (Convex 1.31+ requires it — `nvm use 22`)
- A [Convex](https://convex.dev) account (free; this is the host)
- Vendor accounts are **optional** — any primitive without a key runs on its mock.

## 1. Install

```bash
bun install
```

## 2. Start Convex

```bash
npx convex dev --until-success
```

This logs you in, provisions a dev deployment, applies the schema, and generates types in
`convex/_generated/`. Leave it running.

## 3. Set the gateway key (required)

Every endpoint is gated by one Bearer key. Anything without it gets a 401.

```bash
npx convex env set GATEWAY_API_KEY "$(openssl rand -hex 24)"
```

Read it back with `npx convex env get GATEWAY_API_KEY`.

## 4. Connect your providers (optional)

Omit any of these and that primitive runs on its mock. Set them on the deployment:

| Primitive | Env var(s) | Adapter | Omit → |
|---|---|---|---|
| Phone | `AGENTPHONE_API_KEY` | AgentPhone | mock |
| Email | `AGENTMAIL_API_KEY`, `AGENTMAIL_INBOX_ID` | AgentMail | mock |
| Wallet | `AGENTCARD_API_KEY` | AgentCard | mock |
| Computer | `FREESTYLE_API_KEY` | Freestyle VM | mock |
| Storage | `ARCHIL_API_KEY`, `ARCHIL_DISK_ID` | Archil | mock |
| Todo | _(none)_ | Convex DB | always real |

```bash
npx convex env set AGENTMAIL_API_KEY "…"
npx convex env set AGENTMAIL_INBOX_ID "…"
# … and so on for the primitives you want live
```

> Note: the real vendor adapters are currently typed stubs that throw — they're gated on the
> open questions in SPEC.md §15. Until those are wired, leave the keys unset to use the mocks.

## 5. Try it

Convex prints your HTTP URL (looks like `https://<name>.convex.site`). Then:

```bash
URL="https://<name>.convex.site"
KEY="<your GATEWAY_API_KEY>"

# Create a todo (intake) — returns it in state "requested"
curl -s -X POST "$URL/v1/todo" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"title":"October ads — 10x","brief":"10 ads, 9:16, sleep supplement","channelOrigin":"api"}'

# List all work state
curl -s "$URL/v1/todo" -H "Authorization: Bearer $KEY"

# Advance it (provider side): requested → accepted
curl -s -X POST "$URL/v1/todo/<id>/advance" \
  -H "Authorization: Bearer $KEY" -H "Content-Type: application/json" \
  -d '{"to":"accepted"}'

# Missing/!wrong key → 401
curl -s -o /dev/null -w "%{http_code}\n" "$URL/v1/todo"
```

An illegal transition (e.g. `requested → delivered`) returns **409** — the state machine
(`core/domain/todo.ts`) enforces the lifecycle.

## 6. Point your agent at it

An agent (Claude) drives the primitives over the same endpoints. `mcp/server.ts` is a
dependency-free client (`createTodo`, `listTodos`, `getTodo`, `commentTodo`); wrap it with
`@modelcontextprotocol/sdk` to expose each as an MCP tool, configured with your `baseUrl` +
`GATEWAY_API_KEY`.

## Tests & typecheck

```bash
bun test                # core domain (state machine) tests
bun run typecheck       # typechecks the pure hexagon (core + adapters + mcp)
```

The `convex/` tree typechecks under `npx convex dev` once `_generated/` exists.

## Layout

```
core/      pure hexagon — ports (the 6 primitives), domain (todo state machine, budget), services
adapters/  one folder per vendor: real adapter + parallel mock
convex/    the host — schema, DB fns, auth, composition root, HTTP router
mcp/       dependency-free gateway client for agents
```

See [SPEC.md](./SPEC.md) for the protocol and [SCENARIOS.md](./SCENARIOS.md) for the worked
creative-agency example.
