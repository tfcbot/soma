import { operations, type OperationId, type Input, type Output } from "@workstation/contract";

export interface WorkstationConfig {
  apiKey?: string; // falls back to WORKSTATION_API_KEY, then ~/.workstation/config.json
  baseUrl?: string; // falls back to WORKSTATION_API_URL, then ~/.workstation/config.json, then localhost
}

// The client's surface is INFERRED from the contract registry — one typed method per operation,
// with input/output types straight from the Zod schemas. No codegen: in a monorepo the SDK simply
// imports the same source of truth the server uses, so they can never drift.
export type WorkstationClient = {
  [K in OperationId]: (input: Input<K>) => Promise<Output<K>>;
};

// A single structured issue from a 400 invalid_request response (first-class Zod issues).
export interface WorkstationErrorIssue {
  path: string;
  message: string;
}

// The stable, machine-readable error codes the gateway emits in the "error" field.
// Agents on the SDK can switch on `error.code` and recover deterministically.
export type WorkstationErrorCode =
  | "invalid_request"
  | "unauthorized"
  | "payment_required"
  | "forbidden"
  | "rate_limited"
  | "upstream_error";

// Thrown for any non-2xx response. Surfaces the canonical error envelope as typed fields
// (so agents never have to re-parse the JSON body) plus the response headers an agent must
// honor for backoff (Retry-After) and the x402/MPP payment challenge (WWW-Authenticate).
export class WorkstationError extends Error {
  // Stable machine code from the envelope's "error" field, e.g. "payment_required".
  // Falls back to undefined for non-envelope bodies (e.g. an upstream proxy error).
  readonly code?: WorkstationErrorCode | string;

  // 400 invalid_request: structured Zod issues, not a stringified blob.
  readonly issues?: WorkstationErrorIssue[];

  // 401 unauthorized: where a fresh agent self-provisions an API key.
  readonly signupUrl?: string;

  // 402 payment_required.
  readonly required?: number;
  readonly balance?: number;
  readonly shortfall?: number;
  readonly topupUrl?: string;

  // 403 forbidden.
  readonly requiredScope?: string;
  readonly grantedScopes?: string[];

  // 429 rate_limited (also parsed from the Retry-After header, in seconds).
  readonly retryAfter?: number;

  // Raw WWW-Authenticate header (the x402/MPP payment challenge on 402).
  readonly wwwAuthenticate?: string;

  // 5xx upstream_error: vendor/upstream throws are safe to retry.
  readonly retryable?: boolean;

  constructor(
    readonly status: number,
    readonly body: unknown,
    headers?: Headers,
  ) {
    const env = (typeof body === "object" && body !== null ? body : {}) as Record<string, unknown>;
    super(typeof env.message === "string" ? env.message : `HTTP ${status}`);
    this.name = "WorkstationError";

    if (typeof env.error === "string") this.code = env.error;
    if (typeof env.retryable === "boolean") this.retryable = env.retryable;

    // 400 invalid_request
    if (Array.isArray(env.issues)) {
      this.issues = env.issues
        .filter((i): i is Record<string, unknown> => typeof i === "object" && i !== null)
        .map((i) => ({ path: String(i.path ?? ""), message: String(i.message ?? "") }));
    }

    // 401 unauthorized
    if (typeof env.signupUrl === "string") this.signupUrl = env.signupUrl;

    // 402 payment_required
    if (typeof env.required === "number") this.required = env.required;
    if (typeof env.balance === "number") this.balance = env.balance;
    if (typeof env.shortfall === "number") this.shortfall = env.shortfall;
    if (typeof env.topupUrl === "string") this.topupUrl = env.topupUrl;

    // 403 forbidden
    if (typeof env.requiredScope === "string") this.requiredScope = env.requiredScope;
    if (Array.isArray(env.grantedScopes)) {
      this.grantedScopes = env.grantedScopes.filter((s): s is string => typeof s === "string");
    }

    // Headers: backoff (Retry-After) + payment challenge (WWW-Authenticate).
    const headerRetryAfter = headers?.get("Retry-After");
    if (headerRetryAfter != null) {
      const parsed = Number(headerRetryAfter);
      if (Number.isFinite(parsed)) this.retryAfter = parsed;
    }
    // Fall back to the envelope's retryAfter if the header was absent/unparseable.
    if (this.retryAfter === undefined && typeof env.retryAfter === "number") {
      this.retryAfter = env.retryAfter;
    }

    const headerWwwAuth = headers?.get("WWW-Authenticate");
    if (headerWwwAuth != null) this.wwwAuthenticate = headerWwwAuth;
  }
}

function readConfigFile(): { apiUrl?: string; apiKey?: string } | null {
  try {
    // Lazy node-only read; harmless in edge/browser (returns null).
    const { readFileSync, existsSync } = require("fs");
    const { join } = require("path");
    const { homedir } = require("os");
    const p = join(homedir(), ".workstation", "config.json");
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    /* ignore */
  }
  return null;
}

export function createClient(config: WorkstationConfig = {}): WorkstationClient {
  const file = readConfigFile();
  const apiKey = config.apiKey ?? process.env.WORKSTATION_API_KEY ?? file?.apiKey;
  const baseUrl =
    config.baseUrl ?? process.env.WORKSTATION_API_URL ?? file?.apiUrl ?? "http://127.0.0.1:3211";

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers.Authorization = `Bearer ${apiKey}`;

  const client = {} as Record<string, (input: unknown) => Promise<unknown>>;
  for (const [opId, op] of Object.entries(operations)) {
    client[opId] = async (input: unknown) => {
      let url = baseUrl + op.path;
      const init: RequestInit = { method: op.method, headers };
      if (op.inputFrom === "query") {
        const params = new URLSearchParams();
        for (const [k, val] of Object.entries((input ?? {}) as Record<string, unknown>)) {
          if (val !== undefined && val !== null) params.set(k, String(val));
        }
        const qs = params.toString();
        if (qs) url += `?${qs}`;
      } else {
        init.body = JSON.stringify(input ?? {});
      }
      const res = await fetch(url, init);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new WorkstationError(res.status, body, res.headers);
      return body;
    };
  }
  return client as WorkstationClient;
}
