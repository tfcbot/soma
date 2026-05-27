#!/usr/bin/env node
import { defineCommand, runMain } from "citty";
import { VERSION } from "./version";

const main = defineCommand({
  meta: {
    name: "soma",
    version: VERSION,
    description: "Soma — a programmable body for an agent's brain.",
  },
  subCommands: {
    auth: () => import("./commands/auth").then((m) => m.default),
    todo: () => import("./commands/todo").then((m) => m.default),
    version: () => import("./commands/version").then((m) => m.default),
  },
});

runMain(main);
