#!/usr/bin/env node
/**
 * Soma MCP server. Wraps the Soma SDK and exposes each primitive/command as an MCP tool,
 * so any MCP-speaking agent (Claude Desktop, Claude Code, …) can drive the body.
 *
 * Config: reads SOMA_API_KEY / SOMA_API_URL (or ~/.soma/config.json) via the SDK.
 * Transport: stdio.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { createClient } from "soma";

const soma = createClient();

const server = new McpServer({
  name: "soma",
  version: "0.1.0",
});

// Render any SDK result ({ data, error, response }) as MCP tool output.
function result(r: { data?: unknown; error?: unknown; response: Response }) {
  const payload = r.error ?? r.data ?? null;
  return {
    isError: !!r.error,
    content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
  };
}

const todoState = z.enum([
  "requested",
  "accepted",
  "in_production",
  "qa",
  "delivered",
  "approved",
  "revise",
]);

server.registerTool(
  "create_todo",
  {
    title: "Create todo",
    description: "Intake a unit of work. Creates a todo in `requested` — the single client write.",
    inputSchema: {
      title: z.string(),
      brief: z.string(),
      channelOrigin: z.string().optional(),
      budget: z
        .object({ authorized: z.number(), spent: z.number(), currency: z.string() })
        .optional(),
    },
  },
  async (args) => result(await soma.createTodo(args)),
);

server.registerTool(
  "list_todos",
  { title: "List todos", description: "Return all work state.", inputSchema: {} },
  async () => result(await soma.listTodos()),
);

server.registerTool(
  "get_todo",
  {
    title: "Get todo",
    description: "Fetch one todo by id.",
    inputSchema: { id: z.string() },
  },
  async ({ id }) => result(await soma.getTodo(id)),
);

server.registerTool(
  "comment_todo",
  {
    title: "Comment on todo",
    description: "Append a note. On a delivered todo, bounces it to `revise`.",
    inputSchema: { id: z.string(), note: z.string() },
  },
  async ({ id, note }) => result(await soma.commentTodo(id, { note })),
);

server.registerTool(
  "advance_todo",
  {
    title: "Advance todo",
    description: "Move the todo along a legal lifecycle edge.",
    inputSchema: { id: z.string(), to: todoState },
  },
  async ({ id, to }) => result(await soma.advanceTodo(id, { to })),
);

server.registerTool(
  "deliver_todo",
  {
    title: "Deliver artifact",
    description:
      "Publish a sandbox artifact to the filesystem/CDN, mark delivered, and notify by email.",
    inputSchema: {
      id: z.string(),
      sandboxPath: z.string(),
      filename: z.string(),
      recipient: z.string(),
    },
  },
  async ({ id, sandboxPath, filename, recipient }) =>
    result(await soma.deliverTodo(id, { sandboxPath, filename, recipient })),
);

server.registerTool(
  "fund_todo",
  {
    title: "Fund prepaid card",
    description: "Issue a prepaid card within the todo's authorized budget envelope.",
    inputSchema: {
      id: z.string(),
      amountCents: z.number(),
      memo: z.string(),
      recipient: z.string().optional(),
    },
  },
  async ({ id, amountCents, memo, recipient }) =>
    result(await soma.fundTodo(id, { amountCents, memo, recipient })),
);

const transport = new StdioServerTransport();
await server.connect(transport);
