import { rateLimiter } from "hono-rate-limiter";
import type { Context, Next } from "hono";
import { ApiError } from "../lib/errors.js";

// 50 requests / minute / user per individual API endpoint
// (or per IP for unauthenticated public reads).
export const globalLimiter = rateLimiter({
  windowMs: 60_000,
  limit: 50,
  standardHeaders: "draft-7",
  message: { error: { code: "RATE_LIMITED", message: "Too many requests. Please try again in a minute." } },
  statusCode: 429,
  keyGenerator: (c: Context) => {
    const userId = c.get("userId" as never) as string | undefined;
    const actor = userId
      ? `u:${userId}`
      : `ip:${c.req.header("x-forwarded-for") ?? c.req.header("x-real-ip") ?? "anon"}`;
    const endpoint = `${c.req.method}:${new URL(c.req.url).pathname}`;
    return `${actor}:${endpoint}`;
  },
});

// ── Chat-specific limiter ──────────────────────────────────────────────────
// The global 50/min cap is too loose for an LLM endpoint. We enforce two
// rolling windows on POST /chat/:area, keyed by userId only (so spamming
// across areas still counts):
//   - 20 messages / minute
//   - 200 messages / day
// Returns 429 with { retryAfterSeconds } so the client can show an exact
// countdown.

const MINUTE_LIMIT = 20;
const DAY_LIMIT = 200;
const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * 60_000;

type Bucket = { times: number[] }; // monotonically increasing timestamps (ms)
const buckets = new Map<string, Bucket>();

function getBucket(userId: string): Bucket {
  let b = buckets.get(userId);
  if (!b) {
    b = { times: [] };
    buckets.set(userId, b);
  }
  return b;
}

function prune(bucket: Bucket, now: number): void {
  const cutoff = now - DAY_MS;
  // Trim from the front; entries are appended in order.
  let i = 0;
  while (i < bucket.times.length && bucket.times[i] < cutoff) i++;
  if (i > 0) bucket.times.splice(0, i);
}

export async function chatPostLimiter(c: Context, next: Next) {
  const userId = c.get("userId" as never) as string | undefined;
  if (!userId) {
    // authMiddleware should have set this; if not, let the normal auth
    // failure paths handle it rather than silently 429.
    await next();
    return;
  }

  const now = Date.now();
  const bucket = getBucket(userId);
  prune(bucket, now);

  const minuteCount = bucket.times.reduce((n, t) => (t >= now - MINUTE_MS ? n + 1 : n), 0);
  const dayCount = bucket.times.length;

  if (minuteCount >= MINUTE_LIMIT) {
    const oldestInWindow = bucket.times.find((t) => t >= now - MINUTE_MS) ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldestInWindow + MINUTE_MS - now) / 1000));
    throw new RateLimitedError("You're sending messages too quickly. Please slow down.", retryAfterSeconds);
  }
  if (dayCount >= DAY_LIMIT) {
    const oldest = bucket.times[0] ?? now;
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + DAY_MS - now) / 1000));
    throw new RateLimitedError("Daily chat limit reached. Try again tomorrow.", retryAfterSeconds);
  }

  bucket.times.push(now);
  await next();
}

// ApiError doesn't carry a structured retryAfter, so we wrap our own and
// have the global handler unpack it via duck-typing through the message field.
// Easier: subclass ApiError so the existing onError still handles status/code.
export class RateLimitedError extends ApiError {
  readonly retryAfterSeconds: number;
  constructor(message: string, retryAfterSeconds: number) {
    super(429, "RATE_LIMITED", message);
    this.retryAfterSeconds = retryAfterSeconds;
  }
}
