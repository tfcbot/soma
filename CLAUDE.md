# CLAUDE.md

Workstation is a template you clone to launch a metered **API + CLI + MCP** gateway. The canonical
recipe and guardrails live in AGENTS.md — read it before editing anything.

@AGENTS.md

- **Set it up:** run the `customize-workstation` skill — `skills/customize-workstation/SKILL.md`
  (clone → run on mocks → connect vendors → Stripe test round-trip). One-command launch:
  `bun run setup`; smoke check: `bun run smoke`.
- **Connect vendors / env / worked example:** `GETTING_STARTED.md`.
- **Don't** edit `convex/gateway.ts`, `convex/invoke.ts`, or `convex/http.ts` — they're generic.
  Add a capability the one-folder way under `modules/<cap>/` (see AGENTS.md).
