import type { PhonePort } from "./operations";

export class MockPhone implements PhonePort {
  readonly sent: { to: string; body: string }[] = [];
  async sendSms(input: { to: string; body: string }) {
    this.sent.push(input);
    return { id: `sms_mock_${this.sent.length}` };
  }
}
