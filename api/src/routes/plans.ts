import { Hono } from "hono";
import { sql } from "../lib/supabase.js";
import { badRequest, conflict, forbidden, notFound } from "../lib/errors.js";
import { authMiddleware, optionalAuthMiddleware } from "../middleware/auth.js";
import type { AppVariables, DbPlan } from "../types.js";

const app = new Hono<{ Variables: AppVariables }>();

function normalizePlanName(name: string) {
  return name
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

app.get("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const rows = await sql<DbPlan[]>`
    select * from retirement.plans where user_id = ${userId}::uuid order by updated_at
  `;
  return c.json(rows);
});

app.post("/", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ name: string; inputs: unknown }>();

  if (!body.name || !body.inputs) {
    throw badRequest("Name and inputs are required.");
  }
  const name = normalizePlanName(body.name);
  if (!name) throw badRequest("Name and inputs are required.");

  const [{ count }] = await sql<[{ count: string }]>`
    select count(*) from retirement.plans where user_id = ${userId}::uuid
  `;
  if (Number(count) >= 3) {
    throw conflict("You can save up to 3 plans. Delete one to create another.");
  }

  const [existingPlan] = await sql<DbPlan[]>`
    select * from retirement.plans
    where user_id = ${userId}::uuid and name = ${name}
    limit 1
  `;
  if (existingPlan) {
    throw conflict("You already have a plan with that name.");
  }

  const [plan] = (await sql`
    insert into retirement.plans (user_id, name, inputs)
    values (${userId}::uuid, ${name}, ${sql.json(body.inputs as any)})
    returning *
  `) as DbPlan[];
  return c.json(plan, 201);
});

app.get("/:id", optionalAuthMiddleware, async (c) => {
  const userId = c.get("userId") as string | undefined;
  const id = c.req.param("id");
  if (!id) throw notFound();

  const [plan] = (await sql`
    select * from retirement.plans where id = ${id}::uuid
  `) as DbPlan[];
  if (!plan) throw notFound();

  if (!plan.is_public && plan.user_id !== userId) {
    throw forbidden();
  }
  return c.json(plan);
});

app.put("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; inputs?: unknown; isPublic?: boolean }>();
  if (!id) throw notFound();
  const name = body.name !== undefined ? normalizePlanName(body.name) : undefined;
  if (body.name !== undefined && !name) throw badRequest("Name is required.");

  if (name !== undefined) {
    const [existingPlan] = await sql<DbPlan[]>`
      select * from retirement.plans
      where user_id = ${userId}::uuid
        and name = ${name}
        and id <> ${id}::uuid
      limit 1
    `;
    if (existingPlan) {
      throw conflict("You already have a plan with that name.");
    }
  }

  const [plan] = (await sql`
    update retirement.plans
    set updated_at = now()
      ${name !== undefined ? sql`, name = ${name}` : sql``}
      ${body.inputs !== undefined ? sql`, inputs = ${sql.json(body.inputs as any)}` : sql``}
      ${body.isPublic !== undefined ? sql`, is_public = ${body.isPublic}` : sql``}
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning *
  `) as DbPlan[];
  if (!plan) throw notFound();
  return c.json(plan);
});

app.delete("/:id", authMiddleware, async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  if (!id) throw notFound();

  const [plan] = (await sql`
    delete from retirement.plans
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning *
  `) as DbPlan[];
  if (!plan) throw notFound();
  return c.json({ success: true });
});

export default app;
