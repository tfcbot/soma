import { defineCommand } from "citty";
import { setApiKey, setApiUrl, getConfig, CONFIG_FILE } from "../client";

export default defineCommand({
  meta: { name: "auth", description: "Set the gateway API key (and optionally the API URL)" },
  args: {
    key: { type: "string", description: "Gateway API key" },
    url: { type: "string", description: "API base URL (e.g. https://<deployment>.convex.site)" },
  },
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
