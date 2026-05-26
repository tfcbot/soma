import type { Phone } from "../../core/ports/phone";

export class MockPhone implements Phone {
  async sendSms(to: string, body: string): Promise<{ id: string }> {
    console.log(`[mock:phone] SMS → ${to}: ${body}`);
    return { id: `sms_mock_${Date.now()}` };
  }
}
