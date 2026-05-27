using Http;

namespace Soma;

@doc("Error envelope returned by every non-2xx response.")
model ApiError {
  @doc("Machine-readable error code, e.g. bad_request, not_found, operation_error.")
  error: string;

  @doc("Human-readable explanation.")
  message: string;
}

@doc("400 Bad Request — missing or invalid fields.")
@error
model BadRequestResponse {
  @statusCode _: 400;
  @body body: ApiError;
}

@doc("401 Unauthorized — missing or invalid 'Authorization: Bearer <key>'.")
@error
model UnauthorizedResponse {
  @statusCode _: 401;
  @body body: ApiError;
}

@doc("404 Not Found — no todo with that id, or unknown action.")
@error
model NotFoundResponse {
  @statusCode _: 404;
  @body body: ApiError;
}

@doc("409 Conflict — illegal state transition or vendor operation failure.")
@error
model ConflictResponse {
  @statusCode _: 409;
  @body body: ApiError;
}
