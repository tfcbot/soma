import { defineCommand } from "citty";
import { operations } from "@workstation/contract";

// Discovery: list every operation in the contract registry so an agent can see what's available
// (id, method, path, cost, summary) without reading the source.
export default defineCommand({
  meta: { name: "ops", description: "List every operation in the gateway contract" },
  args: {
    json: { type: "boolean", description: "Emit the registry as JSON instead of a table" },
  },
  async run({ args }) {
    const rows = Object.entries(operations).map(([id, op]) => ({
      id,
      method: op.method,
      path: op.path,
      costCents: op.costCents,
      summary: op.summary,
    }));

    if (args.json) {
      console.log(JSON.stringify(rows, null, 2));
      return;
    }

    for (const r of rows) {
      console.log(`${r.id}\t${r.method} ${r.path}\t${r.costCents}¢\t${r.summary}`);
    }
  },
});
