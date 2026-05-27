import { z } from "zod";
import { op } from "../../packages/contract/src/op";

const sendSmsInput = z.object({ to: z.string(), body: z.string() });
const sendSmsOutput = z.object({ id: z.string() });

// The registry slice for this capability.
export const ops = {
  phoneSendSms: op({
    method: "POST", path: "/v1/phone/messages", inputFrom: "body",
    input: sendSmsInput, output: sendSmsOutput,
    costCents: 5, summary: "Send an SMS",
    serve: { port: "phone", method: "sendSms" },
  }),
};

// The port interface (self-contained: typed from this module's own schemas).
export interface PhonePort {
  sendSms(input: z.infer<typeof sendSmsInput>): Promise<z.infer<typeof sendSmsOutput>>;
}
