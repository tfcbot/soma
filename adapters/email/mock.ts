import type { Email, EmailAttachment } from "../../core/ports/email";

export interface SentEmail {
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
}

// Mock + spy: records every send so tests can assert what was delivered.
export class MockEmail implements Email {
  readonly sent: SentEmail[] = [];

  async send(input: SentEmail): Promise<{ id: string }> {
    this.sent.push(input);
    return { id: `msg_mock_${this.sent.length}` };
  }
}
