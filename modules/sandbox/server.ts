import type { SandboxPort } from "./operations";
import { VercelSandbox } from "./vercel";
import { MockSandbox } from "./mock";

// Real adapter is Vercel Sandbox (persistent, by-name). It needs the calling accountId so each
// account gets its own persistent working tree (Sandbox.getOrCreate({ name: accountId })).
// Falls back to the mock when Vercel credentials are not set.
export function buildSandbox(env: NodeJS.ProcessEnv, accountId: string): SandboxPort {
  const teamId = env.VERCEL_TEAM_ID;
  const projectId = env.VERCEL_PROJECT_ID;
  const token = env.VERCEL_TOKEN;
  // If OIDC is in play (VERCEL_OIDC_TOKEN auto-handled by the SDK) the access-token triple may be
  // absent — but for non-Vercel hosting (Convex) we require it.
  if (!teamId || !projectId || !token) return new MockSandbox();
  return new VercelSandbox({ accountId, teamId, projectId, token });
}
