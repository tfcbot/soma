import type { EmailPort } from "./operations";
import { AgentMailClient } from "agentmail";

export class AgentMail implements EmailPort {
  private readonly client: AgentMailClient;
  constructor(apiKey: string, private readonly inboxId: string) {
    this.client = new AgentMailClient({ apiKey });
  }
  async send(input: Parameters<EmailPort["send"]>[0]) {
    const res = await this.client.inboxes.messages.send(this.inboxId, {
      to: [input.to], subject: input.subject, text: input.body,
      attachments: input.attachments?.map((a) => ({ filename: a.filename, url: a.url })),
    });
    return { id: res.messageId };
  }
}
