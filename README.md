# Programmable Assistant (codename: Soma)

A small, open primitive: **a programmable body for an agent's brain.**

Six primitives — **phone, email, wallet, computer, storage, todo** — exposed through one
opinionated API. They give an agent a *complete loop* to pursue a goal on the internet. We
**operate no agents**; we expose the primitives so *someone else's* agent has everything it
needs. We open-source the body; you bring the brain.

We are deliberately **not** integrating with everything. The bet is that these six primitives
are enough to let an agent operate in the world on someone's behalf — and that the constraint
is what makes the thing buildable, ownable, and extensible. More primitives can be added later
the same way (we're a thin wrapper around vendors).

## What's here

- [SPEC.md](./SPEC.md) — the formal formula: the six primitives, the body/brain split, who
  operates what, the target user, the VPS abstraction argument, the unrestricted-but-sandboxed
  deal, the two-plane computer/storage layer, the service model + Agent Success Manager, the
  `/todo` loop, the budget envelope, and extensibility.
- [SCENARIOS.md](./SCENARIOS.md) — the formula made concrete: a creative agency delivering 10
  ads/month for a Claude-native founder, played out primitive by primitive, plus how a new
  primitive (`publish`) gets added without rewiring.
- [GETTING_STARTED.md](./GETTING_STARTED.md) — run the single-node reference implementation on
  Convex: connect your providers (or run on mocks with zero keys) and drive the primitives.

## Run it

The first build is a **single-node, personal** deployment on Convex (see SPEC.md §16): a true
hexagonal core (`core/`) with one adapter per vendor (`adapters/`), fronted by an
API-key-protected Convex backend (`convex/`). It runs end-to-end on **mock adapters** with no
vendor keys — connect real providers one at a time. See [GETTING_STARTED.md](./GETTING_STARTED.md).

## The one-liner

> Most AI products try to *be* the agent. This one refuses to. It is the body the agent
> borrows — and a service model where the provider runs an **Agent Success Manager** instead
> of a Customer Success Manager.

## Status

Draft. Organizing thoughts before any build. See SPEC.md §11 for open questions that gate
implementation (read-only grant syntax, compute pricing, wallet/KYC, channel media limits,
offer pricing).
