import type { PhonePort, Input, Output } from "../../packages/contract/src/index";

export class MockPhone implements PhonePort {
  readonly sent: Input<"phoneSendSms">[] = [];
  async sendSms(input: Input<"phoneSendSms">): Promise<Output<"phoneSendSms">> {
    this.sent.push(input);
    return { id: `sms_mock_${this.sent.length}` };
  }
}
