import { defineCommand } from "citty";
import { operations } from "@workstation/contract";
import { describeSchema } from "../zod-shape";

// Inspect one operation's input/output shape, derived straight from its Zod schemas in the registry.
export default defineCommand({
  meta: { name: "schema", description: "Print the input/output schema for one operation" },
  args: {
    opId: { type: "positional", description: "Operation id (see `workstation ops`)", required: true },
  },
  async run({ args }) {
    const op = (operations as Record<string, (typeof operations)[keyof typeof operations]>)[args.opId];
    if (!op) {
      const ids = Object.keys(operations).join(", ");
      throw new Error(`Unknown operation "${args.opId}". Known operations: ${ids}`);
    }

    console.log(
      JSON.stringify(
        {
          id: args.opId,
          method: op.method,
          path: op.path,
          costCents: op.costCents,
          summary: op.summary,
          input: describeSchema(op.input),
          output: describeSchema(op.output),
        },
        null,
        2,
      ),
    );
  },
});
