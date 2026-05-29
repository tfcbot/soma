---
description: Workstation — extending & maintaining the metered API + CLI + MCP gateway
alwaysApply: true
---

# Workstation rules

Workstation is a template for a metered **API + CLI + MCP** gateway built from one typed Zod
contract. Read **AGENTS.md** at the repo root first — it's the canonical recipe and guardrails.
For setup, run the `customize-workstation` skill (`skills/customize-workstation/SKILL.md`); to
connect vendors and env, see `GETTING_STARTED.md`.

## Guardrails

- **Never** edit `convex/gateway.ts`, `convex/invoke.ts`, or `convex/http.ts` — they're generic and
  build every surface from the registry. Adding an op never touches them.
- **Add a capability the one-folder way:** create `modules/<cap>/` (Zod schemas + ops + port
  interface + a real adapter + a mock + `server.ts`), then the three one-line registrations in
  `packages/contract/src/operations.ts`, `packages/contract/src/ports.ts`, and `convex/ports.ts`.
  Full recipe in AGENTS.md.
- Secrets live in Convex env vars — never in code or committed.
- Never expose `accounts:grantCredits` / `accounts:mintKey` on a caller-facing route (operator-only).
- Regenerate the OpenAPI spec after contract changes: `bun run generate`.
