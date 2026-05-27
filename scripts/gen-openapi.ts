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

for (const [opId, op] of Object.entries(operations)) {
  const request =
    op.inputFrom === "query"
      ? { query: op.input as z.ZodObject<z.ZodRawShape> }
      : { body: { content: { "application/json": { schema: op.input } } } };
  registry.registerPath({
    method: op.method.toLowerCase() as "get" | "post" | "put" | "delete",
    path: op.path,
    summary: op.summary,
    operationId: opId,
    security: [{ bearerAuth: [] }],
    request,
    responses: {
      200: { description: "OK", content: { "application/json": { schema: op.output } } },
      402: { description: "Payment Required (metered key out of credits)" },
      429: { description: "Too Many Requests (rate limited)" },
    },
  });
}

const doc = new OpenApiGeneratorV3(registry.definitions).generateDocument({
  openapi: "3.0.3",
  info: { title: "Soma", version: "0.1.0" },
  servers: [{ url: "https://api.soma.example" }],
});

const out = resolve(import.meta.dir, "../spec/openapi/spec.json");
mkdirSync(resolve(import.meta.dir, "../spec/openapi"), { recursive: true });
writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
console.log(`Wrote ${out} (${Object.keys((doc as any).paths).length} paths)`);
