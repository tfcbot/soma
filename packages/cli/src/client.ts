// Soma CLI HTTP client. Self-contained (no SDK dep) so the compiled binary stays small.
// Config lives in ~/.soma/config.json — shared with the SDK.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";

export const CONFIG_DIR = join(homedir(), ".soma");
export const CONFIG_FILE = join(CONFIG_DIR, "config.json");

interface Config {
  apiUrl: string;
  apiKey?: string;
}

const DEFAULT_API_URL = "http://127.0.0.1:3211";

function loadConfig(): Config {
  if (existsSync(CONFIG_FILE)) return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  return { apiUrl: DEFAULT_API_URL };
}

function saveConfig(config: Config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

export function getConfig(): Config {
  return loadConfig();
}

export function setApiKey(apiKey: string) {
  const c = loadConfig();
  c.apiKey = apiKey;
  saveConfig(c);
}

export function setApiUrl(url: string) {
  const c = loadConfig();
  c.apiUrl = url;
  saveConfig(c);
}

export async function apiRequest(method: string, path: string, body?: unknown): Promise<unknown> {
  const config = loadConfig();
  if (!config.apiKey) {
    throw new Error('Not authenticated. Run "soma auth --key <your_api_key>" first.');
  }
  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof json === "object" && json && "message" in json
        ? (json as any).message ?? (json as any).error
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return json;
}
