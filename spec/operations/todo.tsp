using Http;
using OpenAPI;

namespace Soma;

@doc("Intake body — the one client write. Creates a todo in `requested`.")
model CreateTodoRequest {
  title: string;
  brief: string;
  channelOrigin?: string;
  budget?: BudgetRef;
}

@doc("201 Created — the new todo.")
model TodoCreated {
  @statusCode _: 201;
  @body body: Todo;
}

model CommentRequest {
  @doc("A note. On a `delivered` todo this bounces it to `revise`.")
  note: string;
}

model AdvanceRequest {
  @doc("Target state. Must be a legal edge from the current state.")
  to: TodoState;
}

@doc("Deliver an artifact: pull from sandbox → publish to filesystem/CDN → mark delivered → email.")
model DeliverRequest {
  sandboxPath: string;
  filename: string;

  @doc("Email recipient for the delivery notification.")
  recipient: string;
}

@doc("Provision a prepaid card within the todo's authorized budget envelope.")
model FundRequest {
  amountCents: int32;
  memo: string;

  @doc("Optional phone/email to notify that a card was funded.")
  recipient?: string;
}

@route("/v1/todo")
@tag("Todo")
interface Todos {
  @post
  @operationId("createTodo")
  @summary("Intake a todo")
  @doc("Create a todo in `requested`. The single client write.")
  create(@body body: CreateTodoRequest): TodoCreated | BadRequestResponse | UnauthorizedResponse | PaymentRequiredResponse;

  @get
  @operationId("listTodos")
  @summary("List todos")
  @doc("Return all work state.")
  list(): Todo[] | UnauthorizedResponse;

  @get
  @route("/{id}")
  @operationId("getTodo")
  @summary("Get a todo")
  get(@path id: string): Todo | NotFoundResponse | UnauthorizedResponse;

  @post
  @route("/{id}/comment")
  @operationId("commentTodo")
  @summary("Comment on a todo")
  @doc("Append a note. On a delivered todo, bounces it to `revise`.")
  comment(@path id: string, @body body: CommentRequest): Todo | BadRequestResponse | ConflictResponse;

  @post
  @route("/{id}/advance")
  @operationId("advanceTodo")
  @summary("Advance a todo's state")
  @doc("Move the todo along a legal lifecycle edge. Illegal edges return 409.")
  advance(@path id: string, @body body: AdvanceRequest): Todo | BadRequestResponse | ConflictResponse;

  @post
  @route("/{id}/deliver")
  @operationId("deliverTodo")
  @summary("Deliver an artifact")
  @doc("Publish a sandbox artifact to the filesystem/CDN, mark delivered, and notify by email.")
  deliver(@path id: string, @body body: DeliverRequest): Todo | BadRequestResponse | ConflictResponse | PaymentRequiredResponse;

  @post
  @route("/{id}/fund")
  @operationId("fundTodo")
  @summary("Fund a prepaid card")
  @doc("Issue a prepaid card within the todo's budget envelope.")
  fund(@path id: string, @body body: FundRequest): FundResult | BadRequestResponse | ConflictResponse | PaymentRequiredResponse;
}
