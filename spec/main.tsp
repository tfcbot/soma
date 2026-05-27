import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";
import "@typespec/rest";

import "./models/common.tsp";
import "./models/todo.tsp";
import "./operations/todo.tsp";

using Http;
using OpenAPI;
using Rest;

@service({
  title: "Soma — Programmable Assistant",
})
@info({
  version: "0.1.0",
})
@server("https://api.soma.example", "Provider deployment")
@useAuth(BearerAuth)
namespace Soma;

// Single shared gateway key (SPEC.md §16): Authorization: Bearer <GATEWAY_API_KEY>.
model BearerAuth is Http.BearerAuth;
