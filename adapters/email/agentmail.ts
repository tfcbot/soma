import type { Email, EmailAttachment } from "../../core/ports/email";
import { AgentMailClient } from "agentmail";

// Real adapter — AgentMail (SDK `agentmail`). Mirrors the proven VidJutsu usage
// (convex/actions/email.ts). Attachments accept a `url` directly, so a CDN link from the
// FileSystem primitive attaches without re-encoding.
export class AgentMail implements Email {
  private readonly client: AgentMailClient;

  constructor(
    apiKey: string,
    private readonly inboxId: string,
  ) {
    this.client = new AgentMailClient({ apiKey });
  }

  async send(input: {
    to: string;
    subject: string;
    body: string;
    attachments?: EmailAttachment[];
  }): Promise<{ id: string }> {
    const res = await this.client.inboxes.messages.send(this.inboxId, {
      to: [input.to],
      subject: input.subject,
      text: input.body,
      attachments: input.attachments?.map((a) => ({ filename: a.filename, url: a.url })),
    });
    return { id: res.messageId };
  }
}
