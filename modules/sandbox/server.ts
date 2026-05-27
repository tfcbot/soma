import type { SandboxPort } from "./operations";
import { FreestyleSandbox } from "./freestyle";
import { MockSandbox } from "./mock";
export function buildSandbox(env: NodeJS.ProcessEnv): SandboxPort {
  return env.FREESTYLE_API_KEY ? new FreestyleSandbox(env.FREESTYLE_API_KEY) : new MockSandbox();
}
