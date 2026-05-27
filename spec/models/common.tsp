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

@doc("RFC 7807 Problem Details body for HTTP 402, returned when a metered key lacks the credits for a call. Content-Type: application/problem+json. Paired with a `WWW-Authenticate: Payment` header so a payment-capable agent (MPP / x402) can settle inline.")
model PaymentRequiredProblem {
  @doc("Problem type URI.")
  type: string = "https://paymentauth.org/problems/payment-required";

  @doc("Short human-readable summary.")
  title: string = "Payment Required";

  @doc("HTTP status (always 402).")
  status: int32 = 402;

  @doc("Human-readable explanation.")
  detail: string;

  @doc("Credits (cents) required for this call.")
  required: int32;

  @doc("Caller's current balance (cents).")
  balance: int32;

  @doc("URL to top up credits.")
  topupUrl: string;
}

@doc("402 Payment Required — metered key has insufficient credits.")
@error
model PaymentRequiredResponse {
  @statusCode _: 402;
  @header contentType: "application/problem+json";
  @body body: PaymentRequiredProblem;
}

@doc("A caller's credit balance.")
model Balance {
  accountId: string;
  creditsCents: int32;
  spentCents: int32;
}
