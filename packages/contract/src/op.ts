import { z } from "zod";

export type Method = "GET" | "POST" | "PUT" | "DELETE";
export type Serve = { port: string; method: string } | { gateway: true };

export interface OpDef<I extends z.ZodTypeAny, O extends z.ZodTypeAny, S extends Serve = Serve> {
  method: Method;
  path: string;
  inputFrom: "query" | "body"; // GET ⇒ query (string-coerced); else JSON body
  input: I;
  output: O;
  costCents: number; // 0 = free; metered keys debited this before the work runs
  summary: string;
  auth?: "key" | "public"; // default "key" — "public" skips auth + metering
  metered?: boolean; // default true; false (or costCents 0) skips the credit gate
  serve: S;
}

// `const S` preserves the literal { port, method } so the serve→ports guard can check it.
export function op<I extends z.ZodTypeAny, O extends z.ZodTypeAny, const S extends Serve>(
  d: OpDef<I, O, S>,
): OpDef<I, O, S> {
  return d;
}
