// Single source of truth for per-operation credit cost, in cents. Imported by BOTH the
// server-side gate (convex/http.ts) and the SDK method generator, so price can never drift
// between the enforced cost and the documented cost. 0 = free. Admin keys bypass entirely.

export const PRICING: Record<string, number> = {
  createTodo: 0,
  listTodos: 0,
  getTodo: 0,
  commentTodo: 0,
  advanceTodo: 0,
  deliverTodo: 100, // publishes to filesystem/CDN + sends email (vendor-touching)
  fundTodo: 50, // issues a prepaid card (vendor-touching)
};

export function costOf(operationId: string): number {
  return PRICING[operationId] ?? 0;
}
