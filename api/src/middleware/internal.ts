import type { Context, Next } from "hono";
import { forbidden } from "../lib/errors.js";

// Allows requests only from the internal domain or with the internal secret header.
// Used for service-to-service calls that bypass user auth.
export async function internalMiddleware(c: Context, next: Next) {
  const host = c.req.header("host") ?? "";
  const internalSecret = c.req.header("x-internal-secret");
  const isInternalDomain = host.startsWith("internal.");
  const hasSecret = internalSecret === process.env.INTERNAL_SECRET;

  if (!isInternalDomain && !hasSecret) {
    throw forbidden();
  }
  await next();
}
