# Test Guide — Infinity Finances

Quick manual tests for every major feature. **One positive (happy path) and one negative (error path) per feature.** Spend ~30 min walking through the list before any deploy.

## Setup

```bash
# 1. Start local Supabase (postgres on :54322, auth on :54321, etc.)
supabase start

# 2. Apply every migration (creates retirement / home / budget / chat schemas)
npm run db:migrate           # ← uses scripts/migrate.sh, defaults to local Supabase
# or: npm run db:reset       # wipes the four schemas first, then re-applies

# 3. Start ui (3000) + api (4000) together
npm run dev
```

[scripts/migrate.sh](../scripts/migrate.sh) is the single source of truth for applying SQL. It runs all files in `supabase/migrations/` in alphabetical order against `$DATABASE_URL` (defaults to the local Supabase Docker URL). Override by exporting `DATABASE_URL=postgresql://…` before running.

Required env: see [auth-setup.md §3](auth-setup.md) for `ui/.env.local`. `api/.env` needs `DATABASE_URL`, `SUPABASE_URL` (or `SUPABASE_JWT_SECRET`), and `GEMINI_API_KEY` for chat to work.

Use an **incognito window** so you start logged-out and with no localStorage.

---

## 1. Auth

### ✅ Google sign-in (positive)
1. Open `http://localhost:3000/auth/login`.
2. Click **Continue with Google** → pick your account in Google's popup.
3. Land back on `/` — top-right shows your avatar/email.
4. DevTools → Application → Cookies — `sb-<ref>-auth-token` is set.

### ❌ Google sign-in (negative)
1. Temporarily comment out `NEXT_PUBLIC_GOOGLE_CLIENT_ID` in `ui/.env.local`, restart dev.
2. Click **Continue with Google** → alert: *"Google sign-in is not configured."*
3. Re-add the env var.

### ✅ Apple sign-in (positive)
Same as Google but with **Continue with Apple**. Popup shows `appleid.apple.com` — never Supabase.

### ❌ Apple sign-in (negative)
1. Click Apple button → in the popup, click the X to close it.
2. No error toast, button returns to idle state (we silently swallow `popup_closed_by_user`).

### ✅ Logged-in routes (positive)
1. Logged in → visit `/` — renders normally.
2. Visit `/?activeTab=expense` — Budget Calc loads.

### ❌ Logged-out gating (negative)
1. Sign out via the navbar avatar menu (or clear cookies).
2. Try to visit a gated route directly (any non-public path that's not `/`, `/auth/*`, `/plan/*`) — you should be redirected to `/auth/login`. *(The home page itself is public.)*

---

## 2. Retirement calc + save plan

### ✅ Calculate + save + load (positive)
1. Logged in → home page → **Simple** mode → enter the 6 numbers → **Calculate**.
2. Results dashboard appears with FIRE number, stat cards, chart.
3. Click **Save plan** → name it `My first plan` → **Save**. Confirmation shows.
4. Click **My plans** drawer (right side) → your plan appears. Click it → wizard loads inputs and recalculates.
5. In the drawer, toggle the globe icon → status changes to public.
6. Click the link icon → copies `…/plan/<uuid>` to clipboard.
7. Open that URL in an **incognito** window — public share page renders the read-only results. (Confirms `/plan/[id]` is public.)

### ❌ Save while logged out (negative)
1. Sign out → calculate any plan → click **Save plan** → you're redirected to `/auth/login`.
2. Try to open a private plan link (`/plan/<uuid-of-non-public-plan>`) in incognito → 404 (the API returns 403/404 for non-public, which becomes `notFound()`).

---

## 3. Home Mortgage calc + profiles

### ✅ Save + switch profiles (positive)
1. Tab to **Home Mortgage Calc**.
2. Fill out **Break-Even**, **Mortgage**, **Affordability** subtabs.
3. Click **Save** in the header → status: `Saved`.
4. Open the profile dropdown → type `Second home` → **Create**.
5. Subtab inputs reset. Fill in different numbers, **Save**.
6. Reopen dropdown → both profiles listed. Switching restores their respective inputs.

### ❌ Save while logged out (negative)
1. Sign out → reload — the Save controls in the header are hidden entirely (intentional — only the Chat button shows).

---

## 4. Budget calc + sync

### ✅ Add transaction + sync on login (positive — local→server migration)
1. **Sign out** completely. Open incognito.
2. Visit `/?activeTab=expense` → Budget Calc loads (default accounts + categories).
3. Click **+** → add a transaction: `$45 expense, Coffee, Cash, today, "Iced latte"`. It appears in the Daily view.
4. Add 2 more transactions and set a $200 monthly budget on Coffee.
5. **Now log in** via Google/Apple/magic link.
6. Watch the network tab — you should see:
   - `GET /money/bootstrap` (returns empty)
   - several `POST /money/categories`, `POST /money/accounts`, then `POST /money/transactions/batch`, then `PUT /money/budgets` *(local→server migration)*
7. Reload the page. Transactions and the budget are still there → confirms they came from the server, not localStorage.
8. Open another incognito tab, log into the same account → same transactions appear. *(Server is the source of truth.)*

### ❌ Rate limit blocks rapid hits (negative)
1. Logged in. In DevTools console, paste:
   ```js
   for (let i = 0; i < 10; i++) fetch(`${location.origin.replace('3000','4000')}/money/bootstrap`, { credentials: 'include' }).then(r => console.log(r.status));
   ```
2. First ~5 responses are `200`, the next ones are `429 Too Many Requests`.

---

## 5. Chat (per area, Gemini, persisted)

### ✅ Send + persist + reload (positive)
1. Logged in → go to **Budget Calc** → click **Ask AI** (top-right of month switcher).
2. Drawer slides in with greeting.
3. Type: `"I spent $12 on coffee yesterday"` → Send.
4. Reply comes back ~2 sec later; if the model extracted a transaction, you'll see it in the response.
5. Close the drawer. Re-open → previous messages are still there.
6. Switch to **Home Mortgage Calc** → click **Ask AI** → a **fresh** chat opens (different session per area).
7. Back to Budget → previous history restored.

### ❌ Logged-out + missing key (negative)
1. Sign out → click **Ask AI** anywhere → redirects to `/auth/login` (no anonymous chat).
2. *(API-side)* Temporarily comment out `GEMINI_API_KEY` in `api/.env`, restart api, send a message → response: *"Sorry, I had trouble responding just now."* Conversation isn't broken — just that one turn errored.

---

## 6. Public share page (`/plan/[id]`)

### ✅ Public plan (positive)
1. From §2 step 7, the incognito visit to `/plan/<uuid>` shows the read-only dashboard.
2. URL works for anyone — no login required.

### ❌ Private plan (negative)
1. From the My plans drawer, toggle a plan back to **private** (lock icon).
2. Open `/plan/<that-uuid>` in incognito → Next.js `notFound()` page.

---

## 7. Smoke checks (one-line each)

- ✅ `npm run build` in `ui/` and `api/` both pass.
- ✅ `curl http://localhost:4000/` returns `{ "name": "infinity-finances/api", "status": "ok" }`.
- ✅ Home page loads with 0 console errors (network 404s for missing `.env` keys don't count).
- ❌ Touching any `*.env*` file requires a dev-server restart; new env vars don't hot-reload.

---

## What "passing" looks like

Every ✅ should match its expected outcome **without console errors**. Every ❌ should fail in exactly the documented way — no 500s, no infinite loaders, no silent data loss.
