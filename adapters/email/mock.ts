import type { Email, EmailAttachment } from "../../core/ports/email";

export class MockEmail implements Email {
  async send(input: {
    to: string;
    subject: string;
    body: string;
    attachments?: EmailAttachment[];
  }): Promise<{ id: string }> {
    const n = input.attachments?.length ?? 0;
    console.log(`[mock:email] → ${input.to} "${input.subject}" (${n} attachment(s))`);
    return { id: `msg_mock_${Date.now()}` };
  }
}
