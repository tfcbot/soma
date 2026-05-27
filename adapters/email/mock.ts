import type { EmailPort, Input, Output } from "../../packages/contract/src/index";

export class MockEmail implements EmailPort {
  readonly sent: Input<"emailSend">[] = [];
  async send(input: Input<"emailSend">): Promise<Output<"emailSend">> {
    this.sent.push(input);
    return { id: `msg_mock_${this.sent.length}` };
  }
}
