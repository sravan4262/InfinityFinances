import type { Context, Next } from "hono";
import { verifyToken } from "../lib/verifyToken.js";
import { unauthorized } from "../lib/errors.js";

export async function authMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  const userId = await verifyToken(token);
  if (!userId) throw unauthorized();

  c.set("userId", userId);
  c.set("user", { id: userId });
  await next();
}

// Optional auth — sets userId if token present (or DEV_USER_ID), doesn't block if missing
export async function optionalAuthMiddleware(c: Context, next: Next) {
  const authHeader = c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;

  try {
    const userId = await verifyToken(token);
    if (userId) {
      c.set("userId", userId);
      c.set("user", { id: userId });
    }
  } catch { /* ignore — treat as unauthenticated */ }
  await next();
}

