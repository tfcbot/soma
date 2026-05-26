import type { Computer, ExecResult } from "../../core/ports/computer";

export class MockComputer implements Computer {
  async exec(command: string): Promise<ExecResult> {
    console.log(`[mock:computer] exec: ${command}`);
    return { stdout: `[mock] ran: ${command}`, stderr: "", exitCode: 0 };
  }
}
