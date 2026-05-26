import type { Computer, ExecResult } from "../../core/ports/computer";

// Real adapter — Freestyle VM (full Linux: install ffmpeg, no 5-min cap). Pattern:
// create/resume a VM with the project repo mounted, then `vm.exec(command)`.
// TODO(SPEC §15): confirm VM CPU/mem/disk limits + pricing and that ffmpeg installs cleanly.
export class FreestyleComputer implements Computer {
  constructor(private readonly apiKey: string) {}

  async exec(_command: string): Promise<ExecResult> {
    void this.apiKey;
    throw new Error("Freestyle adapter not implemented yet — see SPEC.md §15. Use the mock.");
  }
}
