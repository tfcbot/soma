// Minimal, dependency-free client for the gateway. An agent (Claude) drives the primitives
// by calling these over the API-key-protected Convex endpoints.
//
// To expose this as a true MCP server, wrap these calls with @modelcontextprotocol/sdk
// (one tool per function). Kept SDK-free here so the core typechecks with zero extra deps.

export interface GatewayConfig {
  baseUrl: string; // e.g. https://<deployment>.convex.site
  apiKey: string; // GATEWAY_API_KEY
}

function headers(cfg: GatewayConfig): Record<string, string> {
  return { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` };
}

export async function createTodo(
  cfg: GatewayConfig,
  input: { title: string; brief: string; channelOrigin?: string },
): Promise<unknown> {
  const res = await fetch(`${cfg.baseUrl}/v1/todo`, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify(input),
  });
  return res.json();
}

export async function listTodos(cfg: GatewayConfig): Promise<unknown> {
  const res = await fetch(`${cfg.baseUrl}/v1/todo`, { headers: headers(cfg) });
  return res.json();
}

export async function getTodo(cfg: GatewayConfig, id: string): Promise<unknown> {
  const res = await fetch(`${cfg.baseUrl}/v1/todo/${id}`, { headers: headers(cfg) });
  return res.json();
}

export async function commentTodo(cfg: GatewayConfig, id: string, note: string): Promise<unknown> {
  const res = await fetch(`${cfg.baseUrl}/v1/todo/${id}/comment`, {
    method: "POST",
    headers: headers(cfg),
    body: JSON.stringify({ note }),
  });
  return res.json();
}
