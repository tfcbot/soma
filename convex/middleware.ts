import type { httpAction } from "./_generated/server";
import type { Account } from "./auth";
import type { OpDef } from "../packages/contract/src/op";
import { z } from "zod";

type Ctx = Parameters<Parameters<typeof httpAction>[0]>[0];

// The shared request that flows through the pipeline. Middlewares read/mutate it; setting
// `response` short-circuits (remaining `before`s skip, `after`s still run — so a debit can refund).
export interface GwRequest {
  ctx: Ctx;
  httpRequest: Request;
  opId: string;
  op: OpDef<z.ZodTypeAny, z.ZodTypeAny>;
  account: Account | null;
  charged: number;
  input: unknown;
  output: unknown;
  response: Response | null;
}

export interface Middleware {
  name: string;
  before?(r: GwRequest): Promise<void> | void;
  after?(r: GwRequest): Promise<void> | void;
  onError?(r: GwRequest, err: unknown): Promise<void> | void;
}

// Run the stack: befores in order (stop on short-circuit) → core → afters in reverse.
// onError (reverse) lets a middleware (e.g. meter) compensate; if none set a response, rethrow.
export function runPipeline(mws: Middleware[], core: (r: GwRequest) => Promise<void>) {
  return async (r: GwRequest): Promise<void> => {
    try {
      for (const m of mws) {
        if (r.response) break;
        await m.before?.(r);
      }
      if (!r.response) await core(r);
      for (let i = mws.length - 1; i >= 0; i--) await mws[i].after?.(r);
    } catch (err) {
      for (let i = mws.length - 1; i >= 0; i--) await mws[i].onError?.(r, err);
      if (!r.response) throw err;
    }
  };
}
