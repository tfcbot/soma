#!/usr/bin/env node
/**
 * Soma MCP server. Exposes one tool per registry operation — derived from @soma/contract, so the
 * tools, their input schemas, and the SDK all come from the single source of truth.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import type { ZodRawShape } from "zod";
import { operations } from "@soma/contract";
import { createClient } from "soma";

const soma = createClient() as Record<string, (i: unknown) => Promise<unknown>>;
const server = new McpServer({ name: "soma", version: "0.1.0" });

for (const [opId, op] of Object.entries(operations)) {
  // Every op input is a ZodObject; its .shape is the MCP tool input schema.
  const inputSchema = (op.input as unknown as { shape: ZodRawShape }).shape;
  server.registerTool(
    opId,
    { title: op.summary, description: `${op.summary} (${op.method} ${op.path})`, inputSchema },
    async (args: Record<string, unknown>) => {
      try {
        const out = await soma[opId](args);
        return { content: [{ type: "text" as const, text: JSON.stringify(out, null, 2) }] };
      } catch (err) {
        return { isError: true, content: [{ type: "text" as const, text: String((err as Error).message) }] };
      }
    },
  );
}

const transport = new StdioServerTransport();
await server.connect(transport);
