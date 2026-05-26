// API-key gate (SPEC §16). Pattern mirrors VidJutsu's convex/payments.ts getBearerToken,
// simplified to a single GATEWAY_API_KEY compare — single node, no per-client keys.

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function getBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7);
}

/** Returns an error Response if the request is unauthorized, otherwise null. */
export function requireApiKey(req: Request): Response | null {
  const expected = process.env.GATEWAY_API_KEY;
  if (!expected) {
    return json(
      { error: "server_misconfigured", message: "GATEWAY_API_KEY is not set on the deployment." },
      500,
    );
  }
  if (getBearerToken(req) !== expected) {
    return json(
      { error: "auth_required", message: "Missing or invalid 'Authorization: Bearer <key>'." },
      401,
    );
  }
  return null;
}
