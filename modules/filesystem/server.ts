import type { FileSystemPort } from "./operations";
import { ArchilFileSystem } from "./archil";
import { MockFileSystem } from "./mock";
export function buildFileSystem(env: NodeJS.ProcessEnv): FileSystemPort {
  const hasArchil = env.ARCHIL_DISK_ID && env.R2_ACCOUNT_ID && env.R2_ACCESS_KEY_ID &&
    env.R2_ACCESS_KEY_SECRET && env.R2_BUCKET_NAME && env.CDN_BASE_URL;
  return hasArchil
    ? new ArchilFileSystem({
        diskId: env.ARCHIL_DISK_ID!, r2AccountId: env.R2_ACCOUNT_ID!,
        r2AccessKeyId: env.R2_ACCESS_KEY_ID!, r2SecretAccessKey: env.R2_ACCESS_KEY_SECRET!,
        bucket: env.R2_BUCKET_NAME!, cdnBaseUrl: env.CDN_BASE_URL!,
      })
    : new MockFileSystem();
}
