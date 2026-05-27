import "@typespec/http";
import "@typespec/openapi";
import "@typespec/openapi3";
import "@typespec/rest";

import "./models/common.tsp";
import "./models/todo.tsp";
import "./operations/todo.tsp";
import "./operations/billing.tsp";

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

// Per-key account auth (SPEC.md §7.1): Authorization: Bearer <key>. Each key resolves to an
// account (admin = unmetered, metered = credit-gated). No single shared gateway key.
model BearerAuth is Http.BearerAuth;
