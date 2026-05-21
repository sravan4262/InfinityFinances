import { Hono } from "hono";
import { sql } from "../lib/supabase.js";
import { badRequest, notFound } from "../lib/errors.js";
import { authMiddleware } from "../middleware/auth.js";
import type {
  AppVariables,
  DbBudgetAccount,
  DbBudgetCategory,
  DbBudgetTransaction,
  DbBudgetRecurrenceRule,
  DbBudgetMonthlyBudget,
  AccountType,
  TxKind,
  Frequency,
} from "../types.js";

const app = new Hono<{ Variables: AppVariables }>();
app.use("*", authMiddleware);

// ── Single hydration endpoint ───────────────────────────────────────────────
app.get("/bootstrap", async (c) => {
  const userId = c.get("userId");

  const [accounts, categories, transactions, rules, budgets] = await Promise.all([
    sql<DbBudgetAccount[]>`
      select * from budget.accounts where user_id = ${userId}::uuid order by sort_order
    `,
    sql<DbBudgetCategory[]>`
      select * from budget.categories where user_id = ${userId}::uuid order by kind, sort_order
    `,
    sql<DbBudgetTransaction[]>`
      select * from budget.transactions where user_id = ${userId}::uuid order by date desc
    `,
    sql<DbBudgetRecurrenceRule[]>`
      select * from budget.recurrence_rules where user_id = ${userId}::uuid
    `,
    sql<DbBudgetMonthlyBudget[]>`
      select * from budget.monthly_budgets where user_id = ${userId}::uuid
    `,
  ]);

  return c.json({ accounts, categories, transactions, rules, budgets });
});

// ── Accounts ────────────────────────────────────────────────────────────────
app.post("/accounts", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ name: string; type: AccountType }>();
  if (!body.name || !body.type) throw badRequest("Name and type are required.");

  const [{ next_order }] = await sql<{ next_order: number }[]>`
    select coalesce(max(sort_order) + 1, 0) as next_order
    from budget.accounts where user_id = ${userId}::uuid
  `;

  const [account] = await sql<DbBudgetAccount[]>`
    insert into budget.accounts (user_id, name, type, sort_order)
    values (${userId}::uuid, ${body.name}, ${body.type}, ${next_order})
    returning *
  `;
  return c.json(account, 201);
});

app.put("/accounts/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<{ name?: string; type?: AccountType }>();

  const [account] = await sql<DbBudgetAccount[]>`
    update budget.accounts
    set
      ${body.name !== undefined ? sql`name = ${body.name},` : sql``}
      ${body.type !== undefined ? sql`type = ${body.type},` : sql``}
      user_id = user_id
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning *
  `;
  if (!account) throw notFound();
  return c.json(account);
});

app.delete("/accounts/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [account] = await sql<DbBudgetAccount[]>`
    delete from budget.accounts where id = ${id}::uuid and user_id = ${userId}::uuid returning *
  `;
  if (!account) throw notFound();
  return c.json({ success: true });
});

// ── Categories ──────────────────────────────────────────────────────────────
app.post("/categories", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ label: string; color: string; kind: TxKind }>();
  if (!body.label || !body.color || !body.kind) {
    throw badRequest("Label, color, and kind are required.");
  }

  const [{ next_order }] = await sql<{ next_order: number }[]>`
    select coalesce(max(sort_order) + 1, 0) as next_order
    from budget.categories where user_id = ${userId}::uuid and kind = ${body.kind}
  `;

  const [cat] = await sql<DbBudgetCategory[]>`
    insert into budget.categories (user_id, label, color, kind, sort_order)
    values (${userId}::uuid, ${body.label}, ${body.color}, ${body.kind}, ${next_order})
    returning *
  `;
  return c.json(cat, 201);
});

app.delete("/categories/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [cat] = await sql<DbBudgetCategory[]>`
    delete from budget.categories where id = ${id}::uuid and user_id = ${userId}::uuid returning *
  `;
  if (!cat) throw notFound();
  return c.json({ success: true });
});

// ── Transactions ────────────────────────────────────────────────────────────
interface TxBody {
  date: string;
  kind: TxKind;
  amount: number;
  categoryId: string;
  accountId: string;
  note?: string;
  description?: string;
  recurrenceId?: string;
}

app.post("/transactions", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<TxBody>();

  const [tx] = await sql<DbBudgetTransaction[]>`
    insert into budget.transactions
      (user_id, date, kind, amount, category_id, account_id, note, description, recurrence_id)
    values (
      ${userId}::uuid, ${body.date}, ${body.kind}, ${body.amount},
      ${body.categoryId}::uuid, ${body.accountId}::uuid,
      ${body.note ?? null}, ${body.description ?? null},
      ${body.recurrenceId ? sql`${body.recurrenceId}::uuid` : null}
    )
    returning *
  `;
  return c.json(tx, 201);
});

app.put("/transactions/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const body = await c.req.json<Partial<TxBody>>();

  const [tx] = await sql<DbBudgetTransaction[]>`
    update budget.transactions
    set
      ${body.date !== undefined ? sql`date = ${body.date},` : sql``}
      ${body.kind !== undefined ? sql`kind = ${body.kind},` : sql``}
      ${body.amount !== undefined ? sql`amount = ${body.amount},` : sql``}
      ${body.categoryId !== undefined ? sql`category_id = ${body.categoryId}::uuid,` : sql``}
      ${body.accountId !== undefined ? sql`account_id = ${body.accountId}::uuid,` : sql``}
      ${body.note !== undefined ? sql`note = ${body.note},` : sql``}
      ${body.description !== undefined ? sql`description = ${body.description},` : sql``}
      user_id = user_id
    where id = ${id}::uuid and user_id = ${userId}::uuid
    returning *
  `;
  if (!tx) throw notFound();
  return c.json(tx);
});

app.delete("/transactions/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [tx] = await sql<DbBudgetTransaction[]>`
    delete from budget.transactions where id = ${id}::uuid and user_id = ${userId}::uuid returning *
  `;
  if (!tx) throw notFound();
  return c.json({ success: true });
});

// Bulk import — used on first-login local→server migration
app.post("/transactions/batch", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<TxBody[]>();
  if (!Array.isArray(body) || body.length === 0) return c.json([]);

  const rows = body.map((t) => ({
    user_id: userId,
    date: t.date,
    kind: t.kind,
    amount: t.amount,
    category_id: t.categoryId,
    account_id: t.accountId,
    note: t.note ?? null,
    description: t.description ?? null,
    recurrence_id: t.recurrenceId ?? null,
  }));

  const created = (await sql`
    insert into budget.transactions ${sql(
      rows,
      "user_id",
      "date",
      "kind",
      "amount",
      "category_id",
      "account_id",
      "note",
      "description",
      "recurrence_id"
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ) as any}
    returning *
  `) as DbBudgetTransaction[];
  return c.json(created, 201);
});

// ── Recurrence rules ────────────────────────────────────────────────────────
interface RuleBody {
  kind: TxKind;
  amount: number;
  categoryId: string;
  accountId: string;
  note?: string;
  description?: string;
  startDate: string;
  endDate?: string;
  frequency: Frequency;
  interval: number;
}

app.post("/recurrence-rules", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<RuleBody>();

  const [rule] = await sql<DbBudgetRecurrenceRule[]>`
    insert into budget.recurrence_rules
      (user_id, kind, amount, category_id, account_id, note, description,
       start_date, end_date, frequency, interval)
    values (
      ${userId}::uuid, ${body.kind}, ${body.amount},
      ${body.categoryId}::uuid, ${body.accountId}::uuid,
      ${body.note ?? null}, ${body.description ?? null},
      ${body.startDate}, ${body.endDate ?? null},
      ${body.frequency}, ${body.interval}
    )
    returning *
  `;
  return c.json(rule, 201);
});

app.delete("/recurrence-rules/:id", async (c) => {
  const userId = c.get("userId");
  const id = c.req.param("id");
  const [rule] = await sql<DbBudgetRecurrenceRule[]>`
    delete from budget.recurrence_rules where id = ${id}::uuid and user_id = ${userId}::uuid returning *
  `;
  if (!rule) throw notFound();
  return c.json({ success: true });
});

// ── Monthly budgets (upsert; amount=0 deletes) ──────────────────────────────
app.put("/budgets", async (c) => {
  const userId = c.get("userId");
  const body = await c.req.json<{ month: string; categoryId: string; amount: number }>();
  if (!body.month || !body.categoryId) throw badRequest("Month and category are required.");

  if (body.amount <= 0) {
    await sql`
      delete from budget.monthly_budgets
      where user_id = ${userId}::uuid and month = ${body.month} and category_id = ${body.categoryId}::uuid
    `;
    return c.json({ success: true, deleted: true });
  }

  const [row] = await sql<DbBudgetMonthlyBudget[]>`
    insert into budget.monthly_budgets (user_id, month, category_id, amount)
    values (${userId}::uuid, ${body.month}, ${body.categoryId}::uuid, ${body.amount})
    on conflict (user_id, month, category_id) do update set amount = excluded.amount
    returning *
  `;
  return c.json(row);
});

export default app;
