import { Hono } from "hono";
import { sql } from "../lib/supabase.js";
import { badRequest, notFound } from "../lib/errors.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AppVariables, DbTrackerCategory, DbTrackerEntry } from "../types.js";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", authMiddleware);

app.get("/entries", async (c) => {
  const userId = c.get("userId");
  const month = c.req.query("month");

  const rows = month
    ? await sql<DbTrackerEntry[]>`
        select * from retirement.tracker_entries
        where user_id = ${userId}::uuid and month = ${month}
      `
    : await sql<DbTrackerEntry[]>`
        select * from retirement.tracker_entries where user_id = ${userId}::uuid
      `;
  return c.json(rows);
});

app.put("/entries", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<
    Array<{ month: string; categoryId: string; planned?: number; actual?: number }>
  >();

  if (!Array.isArray(body) || body.length === 0) {
    throw badRequest("Body must be a non-empty array.");
  }

  const rows = body.map((e) => ({
    user_id: userId,
    month: e.month,
    category_id: e.categoryId,
    planned: e.planned ?? null,
    actual: e.actual ?? null,
  }));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data = (await sql`
    insert into retirement.tracker_entries ${sql(rows, "user_id", "month", "category_id", "planned", "actual") as any}
    on conflict (user_id, month, category_id) do update
    set
      planned = case when excluded.planned is not null then excluded.planned else retirement.tracker_entries.planned end,
      actual  = case when excluded.actual  is not null then excluded.actual  else retirement.tracker_entries.actual  end
    returning *
  `) as DbTrackerEntry[];
  return c.json(data);
});

app.get("/categories", async (c) => {
  const userId = c.get("userId");
  const rows = await sql<DbTrackerCategory[]>`
    select * from retirement.tracker_categories
    where user_id = ${userId}::uuid
    order by sort_order
  `;
  return c.json(rows);
});

app.post("/categories", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ label: string; color: string }>();

  if (!body.label || !body.color) {
    throw badRequest("Label and color are required.");
  }

  const [last] = await sql<Array<{ sort_order: number }>>`
    select sort_order from retirement.tracker_categories
    where user_id = ${userId}::uuid
    order by sort_order desc
    limit 1
  `;
  const sortOrder = last ? last.sort_order + 1 : 0;

  const [cat] = await sql<DbTrackerCategory[]>`
    insert into retirement.tracker_categories (user_id, label, color, sort_order)
    values (${userId}::uuid, ${body.label}, ${body.color}, ${sortOrder})
    returning *
  `;
  return c.json(cat, 201);
});

app.delete("/categories/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");

  const [cat] = await sql<DbTrackerCategory[]>`
    delete from retirement.tracker_categories
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning *
  `;
  if (!cat) throw notFound();
  return c.json({ success: true });
});

export default app;

