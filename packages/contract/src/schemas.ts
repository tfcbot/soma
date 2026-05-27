import { z } from "zod";

// Binary payloads cross the gateway as base64 (sandbox + filesystem). Capability-specific
// schemas (cards, events, …) live in their own module folder.
export const Base64 = z.string().describe("base64-encoded bytes");
