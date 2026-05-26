// ComputerPort — unrestricted, sandboxed code execution. Adapter: Freestyle VM (or mock).
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface Computer {
  exec(command: string): Promise<ExecResult>;
}
