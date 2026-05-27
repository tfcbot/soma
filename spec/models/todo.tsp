namespace Soma;

@doc("The fixed todo lifecycle (SPEC.md §10). Not a workflow engine — just legal states.")
enum TodoState {
  requested,
  accepted,
  in_production,
  qa,
  delivered,
  approved,
  revise,
}

@doc("The authorized spend envelope for a todo. The prepaid card limit is the hard ceiling.")
model BudgetRef {
  @doc("Authorized ceiling, in cents.")
  authorized: int32;

  @doc("Amount spent so far, in cents.")
  spent: int32;

  @doc("ISO 4217 currency code, e.g. USD.")
  currency: string;
}

@doc("One entry in a todo's append-only state history.")
model TodoHistoryEntry {
  state: TodoState;

  @doc("Epoch milliseconds.")
  ts: int64;

  @doc("Who caused the transition, e.g. provider, agent, principal.")
  actor: string;
}

@doc("A git ref pinning the sandbox workspace state for a todo.")
model TodoRef {
  branch: string;
  commit: string;
}

@doc("The Todo: the unit of work and the unit of observability (SPEC.md §10).")
model Todo {
  @doc("Server-assigned id, e.g. td_….")
  id: string;

  title: string;
  state: TodoState;
  brief: string;

  @doc("Where the work was briefed from, e.g. sms:+1…, email:…")
  channelOrigin?: string;

  budget?: BudgetRef;

  @doc("Deliverable pointers (archil://… / s3://… / CDN url), populated at `delivered`.")
  artifacts: string[];

  ref?: TodoRef;
  history: TodoHistoryEntry[];

  @doc("Epoch milliseconds.")
  createdAt: int64;

  @doc("Epoch milliseconds.")
  updatedAt: int64;
}

@doc("A prepaid virtual card issued against a todo's budget envelope.")
model IssuedCard {
  id: string;
  pan: string;
  cvv: string;
  expiry: string;
  spendLimitCents: int32;
  last4?: string;
}

@doc("Result of funding a card for a todo: the updated todo plus the issued card.")
model FundResult {
  todo: Todo;
  card: IssuedCard;
}
