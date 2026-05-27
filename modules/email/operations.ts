import { z } from "zod";
import { op } from "../../packages/contract/src/op";

const attachment = z.object({ filename: z.string(), url: z.string() });
const sendInput = z.object({
  to: z.string(), subject: z.string(), body: z.string(),
  attachments: z.array(attachment).optional(),
});
const sendOutput = z.object({ id: z.string() });

export const ops = {
  emailSend: op({
    method: "POST", path: "/v1/email/messages", inputFrom: "body",
    input: sendInput, output: sendOutput,
    costCents: 10, summary: "Send an email",
    serve: { port: "email", method: "send" },
  }),
};

export interface EmailPort {
  send(input: z.infer<typeof sendInput>): Promise<z.infer<typeof sendOutput>>;
}
