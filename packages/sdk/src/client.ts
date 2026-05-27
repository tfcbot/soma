import { operations, type OperationId, type Input, type Output } from "@soma/contract";

export interface SomaConfig {
  apiKey?: string; // falls back to SOMA_API_KEY, then ~/.soma/config.json
  baseUrl?: string; // falls back to SOMA_API_URL, then ~/.soma/config.json, then localhost
}

// The client's surface is INFERRED from the contract registry — one typed method per operation,
// with input/output types straight from the Zod schemas. No codegen: in a monorepo the SDK simply
// imports the same source of truth the server uses, so they can never drift.
export type SomaClient = {
  [K in OperationId]: (input: Input<K>) => Promise<Output<K>>;
};

export class SomaError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
  ) {
    super(typeof body === "object" && body && "message" in body ? String((body as any).message) : `HTTP ${status}`);
    this.name = "SomaError";
  }
}

function readConfigFile(): { apiUrl?: string; apiKey?: string } | null {
  try {
    // Lazy node-only read; harmless in edge/browser (returns null).
    const { readFileSync, existsSync } = require("fs");
    const { join } = require("path");
    const { homedir } = require("os");
    const p = join(homedir(), ".soma", "config.json");
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    /* ignore */
  }
  return null;
}

export function createClient(config: SomaConfig = {}): SomaClient {
  const file = readConfigFile();
  const apiKey = config.apiKey ?? process.env.SOMA_API_KEY ?? file?.apiKey;
  const baseUrl =
    config.baseUrl ?? process.env.SOMA_API_URL ?? file?.apiUrl ?? "http://127.0.0.1:3211";

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
      if (!res.ok) throw new SomaError(res.status, body);
      return body;
    };
  }
  return client as SomaClient;
}
