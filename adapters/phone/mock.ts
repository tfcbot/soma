import type { Phone } from "../../core/ports/phone";

// Mock + spy: records every SMS so tests can assert what was sent.
export class MockPhone implements Phone {
  readonly sent: { to: string; body: string }[] = [];

  async sendSms(to: string, body: string): Promise<{ id: string }> {
    this.sent.push({ to, body });
    return { id: `sms_mock_${this.sent.length}` };
  }
}
