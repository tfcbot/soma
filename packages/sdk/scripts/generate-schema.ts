#!/usr/bin/env bun
/**
 * Generate TypeScript types from the Soma OpenAPI spec.
 * Reads the locally-emitted spec (monorepo: no GitHub fetch, no drift) and writes
 * src/schema.d.ts via openapi-typescript.
 *
 * Usage:
 *   bun scripts/generate-schema.ts                           # default: ../../spec/openapi/spec.json
 *   bun scripts/generate-schema.ts --local path/to/spec.json # override
 */
import openapiTS, { astToString } from "openapi-typescript";
import { writeFileSync } from "fs";
import { resolve } from "path";

const DEFAULT_SPEC = resolve(import.meta.dir, "../../../spec/openapi/spec.json");
const outPath = resolve(import.meta.dir, "../src/schema.d.ts");

const localIdx = process.argv.indexOf("--local");
const source =
  localIdx !== -1 && process.argv[localIdx + 1]
    ? resolve(process.argv[localIdx + 1])
    : DEFAULT_SPEC;

console.log("Generating types from spec:", source);
const ast = await openapiTS(new URL(`file://${source}`));
const output = astToString(ast);
writeFileSync(outPath, output);
console.log(`Wrote schema.d.ts (${output.split("\n").length} lines)`);
