// Rate limiting — abuse protection, a separate axis from credits. Credits answer "can the
// caller afford this call?" (402); rate limits answer "is the caller calling too often?" (429).
// This is the FRAMEWORK only: pure fixed-window math + a config shape. Policy (the actual
// limits, and whether limiting is on at all) is the operator's to set — Soma ships it off by
// default (see convex/http.ts: enabled only when SOMA_RATE_LIMIT_PER_MIN is set).

export interface RateRule {
  limit: number; // max calls allowed within the window
  windowMs: number; // window length in ms (fixed window)
}

/** Start (epoch ms) of the fixed window containing `now`. */
export function windowStart(now: number, windowMs: number): number {
  return Math.floor(now / windowMs) * windowMs;
}

/** Seconds until the current window resets — the Retry-After hint for a 429. */
export function retryAfterSeconds(now: number, windowMs: number): number {
  return Math.ceil((windowStart(now, windowMs) + windowMs - now) / 1000);
}

/** True if a call should be REFUSED given the count already recorded in this window. */
export function exceeds(countInWindow: number, rule: RateRule): boolean {
  return countInWindow >= rule.limit;
}
