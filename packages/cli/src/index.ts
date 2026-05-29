#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { operations } from "@workstation/contract";
import { createClient } from "workstation";
import { VERSION } from "./version";
import { setApiKey, setApiUrl, getConfig, CONFIG_FILE } from "./client";
import ops from "./commands/ops";
import schema from "./commands/schema";

// One subcommand per registry operation (registry-driven — adding an op adds a command for free).
// Each takes a single --input JSON flag; the server validates it against the op's Zod schema.
const primitiveCommands: Record<string, ReturnType<typeof defineCommand>> = {};
for (const [opId, op] of Object.entries(operations)) {
  primitiveCommands[opId] = defineCommand({
    meta: { name: opId, description: `${op.summary} (${op.method} ${op.path})` },
    args: { input: { type: "string", description: "JSON input matching the op's schema (see `workstation schema " + opId + "`)" } },
    async run({ args }) {
      const workstation = createClient() as Record<string, (i: unknown) => Promise<unknown>>;
      const input = args.input ? JSON.parse(args.input) : {};
      const out = await workstation[opId](input);
      console.log(JSON.stringify(out, null, 2));
    },
  });
}

const auth = defineCommand({
  meta: { name: "auth", description: "Set the API key (and optionally the API URL)" },
  args: { key: { type: "string" }, url: { type: "string" } },
  async run({ args }) {
    if (args.url) setApiUrl(args.url);
    if (args.key) setApiKey(args.key);
    if (!args.key && !args.url) {
      const c = getConfig();
      console.log(JSON.stringify({ apiUrl: c.apiUrl, apiKey: c.apiKey ? "set" : "unset" }, null, 2));
      return;
    }
    console.log(`Saved to ${CONFIG_FILE}`);
  },
});

const version = defineCommand({
  meta: { name: "version", description: "Print the CLI version" },
  run: () => console.log(VERSION),
});

runMain(
  defineCommand({
    meta: { name: "workstation", version: VERSION, description: "Workstation — a programmable body for an agent's brain." },
    subCommands: { auth, version, ops, schema, ...primitiveCommands },
  }),
);
