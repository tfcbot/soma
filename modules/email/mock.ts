import type { EmailPort } from "./operations";
export class MockEmail implements EmailPort {
  readonly sent: Parameters<EmailPort["send"]>[0][] = [];
  async send(input: Parameters<EmailPort["send"]>[0]) {
    this.sent.push(input);
    return { id: `msg_mock_${this.sent.length}` };
  }
}
