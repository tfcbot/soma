// The Todo: the unit of work and the unit of observability (SPEC.md §10).
// Pure domain — no persistence, no vendors.

export type TodoState =
  | "requested"
  | "accepted"
  | "in_production"
  | "qa"
  | "delivered"
  | "approved"
  | "revise";

export interface BudgetRef {
  authorized: number;
  spent: number;
  currency: string;
}

export interface TodoHistoryEntry {
  state: TodoState;
  ts: number;
  actor: string;
}

export interface Todo {
  id: string;
  title: string;
  state: TodoState;
  brief: string;
  channelOrigin?: string;
  budget?: BudgetRef;
  artifacts: string[]; // pointers (e.g. archil://… / s3://…), populated at `delivered`
  ref?: { branch: string; commit: string };
  history: TodoHistoryEntry[];
  createdAt: number;
  updatedAt: number;
}

// The fixed lifecycle (SPEC.md §10). Not a workflow engine — just legal edges.
const TRANSITIONS: Record<TodoState, readonly TodoState[]> = {
  requested: ["accepted"],
  accepted: ["in_production"],
  in_production: ["qa"],
  qa: ["delivered", "in_production"], // QA may bounce back
  delivered: ["approved", "revise"],
  revise: ["in_production"],
  approved: [],
};

export function canTransition(from: TodoState, to: TodoState): boolean {
  return TRANSITIONS[from].includes(to);
}

export class IllegalTransitionError extends Error {
  constructor(from: TodoState, to: TodoState) {
    super(`Illegal todo transition: ${from} → ${to}`);
    this.name = "IllegalTransitionError";
  }
}

export function assertTransition(from: TodoState, to: TodoState): void {
  if (!canTransition(from, to)) throw new IllegalTransitionError(from, to);
}
