#!/usr/bin/env bun
/**
 * Emit the OpenAPI spec from the typed operation registry (the single source of truth).
 * The registry — not this artifact — is authoritative; this just publishes a spec for external /
 * non-TypeScript consumers. Run via `bun run generate`.
 */
import { writeFileSync, mkdirSync } from "fs";
import { resolve } from "path";
import { z } from "zod";
import { extendZodWithOpenApi, OpenAPIRegistry, OpenApiGeneratorV3 } from "@asteasolutions/zod-to-openapi";
import { operations } from "../packages/contract/src/index";

extendZodWithOpenApi(z);
const registry = new OpenAPIRegistry();
registry.registerComponent("securitySchemes", "bearerAuth", { type: "http", scheme: "bearer" });

// Canonical error envelope: every error body is JSON with a stable machine `error` code + `message`,
// plus per-status extras. Registered as named components so each path response is a single $ref
// (keeps the emitted spec compact + deterministic). Modeled on core/domain + convex/gateway.
const InvalidRequestError = registry.register(
  "InvalidRequestError",
  z.object({
    error: z.literal("invalid_request").openapi({ description: "Stable machine-readable error code." }),
    message: z.string().openapi({ description: "Human-readable summary." }),
    issues: z
      .array(z.object({ path: z.string(), message: z.string() }))
      .openapi({ description: "First-class Zod validation issues (path + message), not a stringified blob." }),
  }),
);
const UnauthorizedError = registry.register(
  "UnauthorizedError",
  z.object({
    error: z.literal("unauthorized"),
    message: z.string(),
    signupUrl: z.string().openapi({ description: "Self-provision endpoint (<baseUrl>/v1/signup) a fresh agent can call." }),
  }),
);
const PaymentRequiredError = registry.register(
  "PaymentRequiredError",
  z.object({
    error: z.literal("payment_required"),
    message: z.string(),
    required: z.number().openapi({ description: "Cost of the operation, in credit cents." }),
    balance: z.number().openapi({ description: "Current key balance, in credit cents." }),
    shortfall: z.number().openapi({ description: "required - balance, in credit cents." }),
    topupUrl: z.string().openapi({ description: "Stripe Checkout URL to top up THIS key." }),
    // RFC7807 fields retained for back-compat with existing clients.
    type: z.string().optional(),
    title: z.string().optional(),
    status: z.number().optional(),
    detail: z.string().optional(),
  }),
);
const ForbiddenError = registry.register(
  "ForbiddenError",
  z.object({
    error: z.literal("forbidden"),
    message: z.string(),
    requiredScope: z.string().openapi({ description: "Scope the operation requires." }),
    grantedScopes: z.array(z.string()).openapi({ description: "Scopes the calling key actually holds." }),
  }),
);
const RateLimitedError = registry.register(
  "RateLimitedError",
  z.object({
    error: z.literal("rate_limited"),
    message: z.string(),
    retryAfter: z.number().openapi({ description: "Seconds to wait before retrying (mirrors the Retry-After header)." }),
  }),
);
const UpstreamError = registry.register(
  "UpstreamError",
  z.object({
    error: z.literal("upstream_error"),
    message: z.string(),
    retryable: z.literal(true).openapi({ description: "Vendor/upstream failure — safe to retry." }),
  }),
);

const jsonBody = (schema: z.ZodTypeAny) => ({ content: { "application/json": { schema } } });

// Derive the exact response-config types from registerPath so the dynamically built `responses`
// object stays type-checked (no `any`/`unknown` escape hatch).
type Responses = Parameters<typeof registry.registerPath>[0]["responses"];

// Mirror the gateway's middleware predicates so docs match runtime behavior:
//   auth   — every op except auth:"public" (skips key + metering)
//   meter  — metered !== false && costCents > 0  (the credit gate that can 402)
//   body   — inputFrom:"body" ops parse a JSON body and can 400 on bad input
type Op = (typeof operations)[keyof typeof operations];
const isAuthed = (op: Op) => op.auth !== "public";
const isMetered = (op: Op) => op.metered !== false && op.costCents > 0;
const hasBody = (op: Op) => op.inputFrom === "body";

for (const [opId, op] of Object.entries(operations)) {
  const request =
    op.inputFrom === "query"
      ? { query: op.input as z.ZodObject<z.ZodRawShape> }
      : { body: jsonBody(op.input) };

  // Build responses in ascending status order so output is deterministic.
  const responses: Responses = {
    200: { description: "OK", content: { "application/json": { schema: op.output } } },
  };
  if (hasBody(op)) {
    responses[400] = { description: "Invalid request (input failed validation)", ...jsonBody(InvalidRequestError) };
  }
  if (isAuthed(op)) {
    responses[401] = { description: "Unauthorized (missing or invalid API key)", ...jsonBody(UnauthorizedError) };
  }
  if (isMetered(op)) {
    responses[402] = { description: "Payment Required (metered key out of credits)", ...jsonBody(PaymentRequiredError) };
  }
  if (isAuthed(op)) {
    responses[403] = { description: "Forbidden (key lacks the required scope)", ...jsonBody(ForbiddenError) };
    responses[429] = { description: "Too Many Requests (rate limited)", ...jsonBody(RateLimitedError) };
  }
  // Vendor/upstream throws surface as a retryable upstream_error (409/502/503). Domain/validation
  // errors keep their own stable 4xx code (e.g. 400 invalid_request) and are NOT collapsed here.
  responses[409] = { description: "Conflict (upstream/operation error — retryable)", ...jsonBody(UpstreamError) };
  responses[502] = { description: "Bad Gateway (vendor/upstream failure — retryable)", ...jsonBody(UpstreamError) };
  responses[503] = { description: "Service Unavailable (vendor/upstream failure — retryable)", ...jsonBody(UpstreamError) };

  registry.registerPath({
    method: op.method.toLowerCase() as "get" | "post" | "put" | "delete",
    path: op.path,
    summary: op.summary,
    operationId: opId,
    security: [{ bearerAuth: [] }],
    request,
    responses,
  });
}

const doc = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: "3.0.3",
  info: { title: "Workstation", version: "0.1.0" },
  servers: [{ url: "https://api.workstation.example" }],
});

// Write to two locations: the canonical spec/ (for SDK/CLI consumers + external tooling) and
// docs/openapi/ (so Mintlify can auto-render the API Reference tab from the live contract).
const outputs = [
  resolve(import.meta.dir, "../spec/openapi/spec.json"),
  resolve(import.meta.dir, "../docs/openapi/spec.json"),
];
const json = JSON.stringify(doc, null, 2) + "\n";
for (const out of outputs) {
  mkdirSync(resolve(out, ".."), { recursive: true });
  writeFileSync(out, json);
  console.log(`Wrote ${out} (${Object.keys((doc as any).paths).length} paths)`);
}
