// API-key helpers shared by auth.ts (hash an incoming key) and accounts.ts (mint a key).
// We store only the SHA-256 hash of a key, never the plaintext — the plaintext is shown once
// at mint time. Web Crypto is available in the Convex isolate runtime.

export async function sha256hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function generateApiKey(): string {
  const hex = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  return `sk_workstation_${hex.slice(0, 48)}`;
}
