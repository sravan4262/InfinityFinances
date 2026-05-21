import { Hono } from "hono";
import { sql } from "../lib/supabase.js";
import { ApiError, badRequest } from "../lib/errors.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AppVariables } from "../types.js";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", authMiddleware);

// Allowlist of flag keys the long-poll endpoint will serve. Add new
// surface-gating flags here; everything else returns 400.
const ALLOWED_KEYS = new Set(["chat"]);

// Track in-flight polls per (userId, key) so a reconnect aborts the prior
// hold. Without this a misbehaving client could keep stacking holders.
const inflight = new Map<string, AbortController>();

const SLEEP_MS = 2_000;
const MAX_HOLD_MS = 25_000;

// Resolution order: per-user override wins, else global default, else false.
// Inlined here so the migration file stays table-only — there is no
// `app.feature_flag_for()` helper in the database.
async function resolveFlag(userId: string, key: string): Promise<{ enabled: boolean; version: string }> {
  const [row] = await sql<{ enabled: boolean; version: string | null }[]>`
    select
      coalesce(
        (select enabled        from app.feature_flag_users where user_id = ${userId}::uuid and key = ${key}),
        (select global_enabled from app.feature_flags      where key = ${key}),
        false
      ) as enabled,
      greatest(
        coalesce((select updated_at from app.feature_flags      where key = ${key}),                                 to_timestamp(0)),
        coalesce((select updated_at from app.feature_flag_users where user_id = ${userId}::uuid and key = ${key}),    to_timestamp(0))
      ) as version
  `;
  const versionDate = row?.version ? new Date(row.version) : new Date(0);
  return {
    enabled: Boolean(row?.enabled),
    version: versionDate.toISOString(),
  };
}

function delay(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(new Error("aborted"));
    };
    if (signal.aborted) {
      clearTimeout(timer);
      reject(new Error("aborted"));
      return;
    }
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

// GET /features/poll?key=chat&since=<iso-timestamp>
// 200 { key, enabled, updated_at } when the resolved value differs from `since`
//     (or `since` is omitted).
// 204 No Content when the long-poll window times out with no change — the
//     client should reconnect with the same `since`.
app.get("/poll", async (c) => {
  const userId = c.get("userId");
  const key = c.req.query("key");
  if (!key || !ALLOWED_KEYS.has(key)) throw badRequest("Unknown feature flag key.");

  const sinceParam = c.req.query("since");
  const sinceMs = sinceParam ? Date.parse(sinceParam) : NaN;
  const sinceVersion = Number.isFinite(sinceMs) ? sinceMs : -Infinity;

  // Replace any previous holder for this (user, key) — the client is asking
  // for a fresh long-poll, so the old one is no longer wanted.
  const slot = `${userId}:${key}`;
  inflight.get(slot)?.abort();
  const controller = new AbortController();
  inflight.set(slot, controller);

  // If the client disconnects (e.g. navigates away), drop the hold early.
  const reqSignal = c.req.raw.signal;
  const onReqAbort = () => controller.abort();
  if (reqSignal.aborted) controller.abort();
  else reqSignal.addEventListener("abort", onReqAbort, { once: true });

  try {
    const startedAt = Date.now();
    while (true) {
      const { enabled, version } = await resolveFlag(userId, key);
      const versionMs = Date.parse(version);

      if (versionMs > sinceVersion) {
        return c.json({ key, enabled, updated_at: version });
      }

      if (Date.now() - startedAt >= MAX_HOLD_MS) {
        // Long-poll window elapsed with no change.
        return c.body(null, 204);
      }

      try {
        await delay(SLEEP_MS, controller.signal);
      } catch {
        // Aborted — newer poll superseded this one, or client disconnected.
        return c.body(null, 204);
      }
    }
  } catch (err) {
    if (err instanceof ApiError) throw err;
    // Anything unexpected from the DB resolution — surface as 500 via the
    // top-level handler.
    throw err;
  } finally {
    // Only clear the slot if we're still the owner — a newer poll may have
    // already replaced us.
    if (inflight.get(slot) === controller) inflight.delete(slot);
    reqSignal.removeEventListener("abort", onReqAbort);
  }
});

export default app;
