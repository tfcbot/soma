// SandboxPort — disposable compute with a versioned workspace. Adapter: Freestyle VM + git
// (alt adapter later: ComputeSDK over E2B/Modal/Vercel — deferred, see SPEC §16).
// The sandbox is where real work runs (ffmpeg, scripts, git). Heavy/long jobs are fine here
// (full Linux, no 5-min cap) — unlike the FileSystem's own exec.
export interface ExecResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface Sandbox {
  exec(command: string): Promise<ExecResult>; // runs in the VM, repo mounted at the workdir
  putFile(path: string, data: Uint8Array | string): Promise<void>; // stage an input in
  getFile(path: string): Promise<Uint8Array | null>; // pull an output out
  dispose(): Promise<void>; // suspend/destroy the VM
}
