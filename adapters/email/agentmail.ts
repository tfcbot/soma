import type { EmailPort, Input, Output } from "../../packages/contract/src/index";
import { AgentMailClient } from "agentmail";

export class AgentMail implements EmailPort {
  private readonly client: AgentMailClient;
  constructor(apiKey: string, private readonly inboxId: string) {
    this.client = new AgentMailClient({ apiKey });
  }
  async send(input: Input<"emailSend">): Promise<Output<"emailSend">> {
    const res = await this.client.inboxes.messages.send(this.inboxId, {
      to: [input.to],
      subject: input.subject,
      text: input.body,
      attachments: input.attachments?.map((a) => ({ filename: a.filename, url: a.url })),
    });
    return { id: res.messageId };
  }
}
