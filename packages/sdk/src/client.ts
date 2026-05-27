import createFetchClient from "openapi-fetch";
import type { paths } from "./schema.js";
import { bindMethods, type SomaMethods } from "./methods.js";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export interface SomaConfig {
  /** Gateway API key. Falls back to SOMA_API_KEY env var, then ~/.soma/config.json. */
  apiKey?: string;
  /** Base URL. Falls back to SOMA_API_URL env var, then ~/.soma/config.json. */
  baseUrl?: string;
}

type FetchClient = ReturnType<typeof createFetchClient<paths>>;

/** Combined client: typed convenience methods + the raw openapi-fetch escape hatch. */
export type SomaClient = SomaMethods & { api: FetchClient };

interface ConfigFile {
  apiUrl?: string;
  apiKey?: string;
}

function readConfigFile(): ConfigFile | null {
  try {
    const p = join(homedir(), ".soma", "config.json");
    if (existsSync(p)) return JSON.parse(readFileSync(p, "utf-8"));
  } catch {
    // Non-Node runtimes (edge/browser) — no config file.
  }
  return null;
}

/**
 * Create a typed Soma API client.
 *
 * @example
 * ```ts
 * import { createClient } from "soma";
 *
 * const soma = createClient(); // reads ~/.soma/config.json or env vars
 *
 * const { data } = await soma.createTodo({ title: "10 ads", brief: "…" });
 * const list = await soma.listTodos();
 * await soma.advanceTodo(data!.id, { to: "accepted" });
 *
 * // Raw escape hatch:
 * const { data: raw } = await soma.api.GET("/v1/todo");
 * ```
 */
export function createClient(config: SomaConfig = {}): SomaClient {
  const file = readConfigFile();
  const apiKey = config.apiKey ?? process.env.SOMA_API_KEY ?? file?.apiKey;
  const baseUrl =
    config.baseUrl ?? process.env.SOMA_API_URL ?? file?.apiUrl ?? "http://127.0.0.1:3211";

  const fetchClient = createFetchClient<paths>({
    baseUrl,
    headers: {
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
      "Content-Type": "application/json",
    },
  });

  return { ...bindMethods(fetchClient), api: fetchClient };
}
