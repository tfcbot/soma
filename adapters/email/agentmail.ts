import type { Email, EmailAttachment } from "../../core/ports/email";

// Real adapter — AgentMail. A working reference exists at
// /Users/blurware/products/vidjutsu-space/vidjutsu/convex/actions/email.ts
// (AgentMailClient + AGENTMAIL_API_KEY / AGENTMAIL_INBOX_ID). Port that here when wiring real.
export class AgentMail implements Email {
  constructor(
    private readonly apiKey: string,
    private readonly inboxId: string,
  ) {}

  async send(_input: {
    to: string;
    subject: string;
    body: string;
    attachments?: EmailAttachment[];
  }): Promise<{ id: string }> {
    void this.apiKey;
    void this.inboxId;
    throw new Error("AgentMail adapter not implemented yet — see SPEC.md §15. Use the mock.");
  }
}
