import { defineCommand } from "citty";
import { apiRequest } from "../client";

const out = (r: unknown) => console.log(JSON.stringify(r, null, 2));

export default defineCommand({
  meta: { name: "todo", description: "Create and drive todos (the work loop)" },
  subCommands: {
    create: defineCommand({
      meta: { name: "create", description: "Intake a todo (the single client write)" },
      args: {
        title: { type: "string", description: "Short title", required: true },
        brief: { type: "string", description: "What the agent should do", required: true },
        channel: { type: "string", description: "Channel origin (e.g. sms:+1…, email:…)" },
        budget: { type: "string", description: "Authorized budget in cents (e.g. 20000)" },
        currency: { type: "string", description: "Currency code", default: "USD" },
      },
      async run({ args }) {
        const body: Record<string, unknown> = { title: args.title, brief: args.brief };
        if (args.channel) body.channelOrigin = args.channel;
        if (args.budget) {
          body.budget = { authorized: Number(args.budget), spent: 0, currency: args.currency };
        }
        out(await apiRequest("POST", "/v1/todo", body));
      },
    }),
    list: defineCommand({
      meta: { name: "list", description: "List all todos" },
      async run() {
        out(await apiRequest("GET", "/v1/todo"));
      },
    }),
    get: defineCommand({
      meta: { name: "get", description: "Get one todo by id" },
      args: { id: { type: "positional", description: "Todo id", required: true } },
      async run({ args }) {
        out(await apiRequest("GET", `/v1/todo/${args.id}`));
      },
    }),
    comment: defineCommand({
      meta: { name: "comment", description: "Comment on a todo (bounces delivered → revise)" },
      args: {
        id: { type: "positional", description: "Todo id", required: true },
        note: { type: "string", description: "The note", required: true },
      },
      async run({ args }) {
        out(await apiRequest("POST", `/v1/todo/${args.id}/comment`, { note: args.note }));
      },
    }),
    advance: defineCommand({
      meta: { name: "advance", description: "Advance a todo to a new state" },
      args: {
        id: { type: "positional", description: "Todo id", required: true },
        to: { type: "string", description: "Target state", required: true },
      },
      async run({ args }) {
        out(await apiRequest("POST", `/v1/todo/${args.id}/advance`, { to: args.to }));
      },
    }),
    deliver: defineCommand({
      meta: { name: "deliver", description: "Deliver a sandbox artifact and notify by email" },
      args: {
        id: { type: "positional", description: "Todo id", required: true },
        path: { type: "string", description: "Sandbox path to the artifact", required: true },
        filename: { type: "string", description: "Delivered filename", required: true },
        recipient: { type: "string", description: "Email recipient", required: true },
      },
      async run({ args }) {
        out(
          await apiRequest("POST", `/v1/todo/${args.id}/deliver`, {
            sandboxPath: args.path,
            filename: args.filename,
            recipient: args.recipient,
          }),
        );
      },
    }),
    fund: defineCommand({
      meta: { name: "fund", description: "Issue a prepaid card within the todo's budget" },
      args: {
        id: { type: "positional", description: "Todo id", required: true },
        amount: { type: "string", description: "Amount in cents", required: true },
        memo: { type: "string", description: "Card memo", required: true },
        recipient: { type: "string", description: "Optional notify phone/email" },
      },
      async run({ args }) {
        const body: Record<string, unknown> = {
          amountCents: Number(args.amount),
          memo: args.memo,
        };
        if (args.recipient) body.recipient = args.recipient;
        out(await apiRequest("POST", `/v1/todo/${args.id}/fund`, body));
      },
    }),
  },
});
