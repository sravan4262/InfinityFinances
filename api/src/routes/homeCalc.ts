import { Hono } from "hono";
import { sql } from "../lib/supabase.js";
import { badRequest, notFound } from "../lib/errors.js";
import { authMiddleware } from "../middleware/auth.js";
import type { AppVariables, DbHomeCalcProfile } from "../types.js";

const app = new Hono<{ Variables: AppVariables }>();

app.use("*", authMiddleware);

app.get("/", async (c) => {
  const userId = c.get("userId");
  const rows = await sql<DbHomeCalcProfile[]>`
    select * from home.profiles
    where user_id = ${userId}::uuid
    order by updated_at desc
  `;
  return c.json(rows);
});

app.post("/", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{
    name: string;
    breakEven?: unknown;
    mortgage?: unknown;
    affordability?: unknown;
  }>();

  if (!body.name) {
    throw badRequest("Name is required.");
  }

  const [profile] = (await sql`
    insert into home.profiles (user_id, name, break_even, mortgage, affordability)
    values (
      ${userId}::uuid,
      ${body.name},
      ${body.breakEven ? sql.json(body.breakEven as any) : null},
      ${body.mortgage ? sql.json(body.mortgage as any) : null},
      ${body.affordability ? sql.json(body.affordability as any) : null}
    )
    returning *
  `) as DbHomeCalcProfile[];
  return c.json(profile, 201);
});

app.get("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  if (!id) throw notFound();

  const [profile] = (await sql`
    select * from home.profiles
    where id = ${id}::uuid and user_id = ${userId}::uuid
  `) as DbHomeCalcProfile[];
  if (!profile) throw notFound();
  return c.json(profile);
});

app.put("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{
    name?: string;
    breakEven?: unknown;
    mortgage?: unknown;
    affordability?: unknown;
  }>();
  if (!id) throw notFound();

  const [profile] = (await sql`
    update home.profiles
    set updated_at = now()
      ${body.name !== undefined ? sql`, name = ${body.name}` : sql``}
      ${body.breakEven !== undefined ? sql`, break_even = ${sql.json(body.breakEven as any)}` : sql``}
      ${body.mortgage !== undefined ? sql`, mortgage = ${sql.json(body.mortgage as any)}` : sql``}
      ${body.affordability !== undefined ? sql`, affordability = ${sql.json(body.affordability as any)}` : sql``}
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning *
  `) as DbHomeCalcProfile[];
  if (!profile) throw notFound();
  return c.json(profile);
});

app.delete("/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  if (!id) throw notFound();

  const [profile] = (await sql`
    delete from home.profiles
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning *
  `) as DbHomeCalcProfile[];
  if (!profile) throw notFound();
  return c.json({ success: true });
});

export default app;
