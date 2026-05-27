import { defineCommand } from "citty";
import { VERSION } from "../version";

export default defineCommand({
  meta: { name: "version", description: "Print the CLI version" },
  async run() {
    console.log(VERSION);
  },
});
