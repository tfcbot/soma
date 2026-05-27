import type { z } from "zod";
import type { OpDef } from "./op";

type AnyOp = OpDef<z.ZodTypeAny, z.ZodTypeAny>;

// An op's scope id: PORT ops → `<port>:<method>` (e.g. "store:listProducts"); GATEWAY ops
// (balance/events) have no scope and are always reachable by any valid key.
export function scopeOf(op: AnyOp): string | null {
  return "gateway" in op.serve ? null : `${op.serve.port}:${op.serve.method}`;
}

// A key's `scopes` are allow-patterns. Granular by default:
//   "*"                → everything
//   "store:*"          → every op on the store primitive (opt-in blanket)
//   "store:listProducts" → exactly that op
// Empty scopes = full environment (an unscoped key can reach everything).
export function scopeAllows(keyScopes: string[], op: AnyOp): boolean {
  if (keyScopes.length === 0) return true;
  const sc = scopeOf(op);
  if (sc === null) return true; // gateway ops always allowed
  return keyScopes.some(
    (p) => p === "*" || p === sc || (p.endsWith(":*") && sc.startsWith(p.slice(0, -1))),
  );
}
