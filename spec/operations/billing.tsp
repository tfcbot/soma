using Http;
using OpenAPI;

namespace Soma;

@route("/v1/balance")
@tag("Billing")
interface Billing {
  @get
  @operationId("getBalance")
  @summary("Get credit balance")
  @doc("Return the calling key's account role and credit balance.")
  get(): Balance | UnauthorizedResponse;
}
