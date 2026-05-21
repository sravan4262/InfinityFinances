# Auth — Email OTP Only

This guide covers two related changes shipped together:

1. **Google and Apple sign-in are disabled** on both web and mobile. The code is commented out, not deleted, so it can be restored later.
2. **Email OTP is the only sign-in method.** The email input is strictly validated before we hand it to Supabase / Resend.

For the original Google + Apple provider setup (kept for reference), see [auth-setup.md](auth-setup.md).

---

## Part 1 — Disabling Google + Apple sign-in

### Why

We're consolidating on email OTP (Supabase Auth + Resend) while we focus on other parts of the app. Removing the OAuth surface area:

- Cuts external dependencies (Google OAuth client, Apple Developer key, Apple JS SDK).
- Removes the "which account did I sign in with last time?" confusion that creates duplicate users.
- Simplifies the login screen to one path.

Code is **commented out, not deleted** so re-enabling later is a small change with no rewrite.

### Web — files changed

| File | Change |
|---|---|
| [ui/app/auth/login/page.tsx](../ui/app/auth/login/page.tsx) | Commented out `GoogleSignInButton` / `AppleSignInButton` imports, their `<Button>` lines, and the "or" divider. Email OTP form is the only path. |
| [ui/components/features/auth/GoogleSignInButton.tsx](../ui/components/features/auth/GoogleSignInButton.tsx) | Whole file wrapped in a block comment. Preserved for reference. |
| [ui/components/features/auth/AppleSignInButton.tsx](../ui/components/features/auth/AppleSignInButton.tsx) | Whole file wrapped in a block comment. Preserved for reference. |
| [ui/app/layout.tsx](../ui/app/layout.tsx) | Apple JS SDK `<Script>` tag commented out. `import Script from "next/script"` removed if it became unused. |

### Mobile — files changed

| File | Change |
|---|---|
| [mobile/src/features/auth/LoginScreen.tsx](../mobile/src/features/auth/LoginScreen.tsx) | `signInWithGoogle` and its `<Pressable>` commented out. Replaced with an email OTP form using `supabase.auth.signInWithOtp({ email })` and the `infinityfinances://auth/callback` deep link. |
| [mobile/app/auth/callback.tsx](../mobile/app/auth/callback.tsx) | No change needed — already handles `access_token` / `refresh_token` returned by Supabase magic links. |

### What we deliberately did NOT change

- `supabase/config.toml` provider sections — harmless when no UI invokes them.
- Env vars (`NEXT_PUBLIC_APPLE_SERVICE_ID`, Google client ID/secret) — left in place so re-enabling is a one-line uncomment.
- Mobile dependencies (`expo-auth-session`, `expo-web-browser`) — still needed if/when we re-enable OAuth on mobile.
- The Supabase callback route handlers ([ui/app/auth/callback/route.ts](../ui/app/auth/callback/route.ts), [mobile/app/auth/callback.tsx](../mobile/app/auth/callback.tsx)) — both already work for magic-link / OTP flows.

### How to re-enable later

1. Uncomment the import + button lines in `ui/app/auth/login/page.tsx`.
2. Uncomment the bodies of `GoogleSignInButton.tsx` and `AppleSignInButton.tsx`.
3. Uncomment the `<Script>` tag and re-add the `Script` import in `ui/app/layout.tsx`.
4. Uncomment `signInWithGoogle` and its `<Pressable>` in `mobile/src/features/auth/LoginScreen.tsx`.
5. Verify env vars and Supabase provider config are still populated (they should be — nothing was removed).

---

## Part 2 — Email input validation

Email OTP is the **only** sign-in method, so a bad email means the user is locked out with no recovery path. We catch problems before sending anything.

### Why we validate client-side

- Typos like `foo@gmial.con`, `foo@bar` (no TLD), trailing spaces.
- Garbage input like `asdf`, `test`, `@@@`.
- Disposable / throwaway addresses (mailinator, tempmail) that bypass account-creation friction and go cold immediately.
- Sending an OTP email to an invalid address wastes Resend quota and shows up in bounce metrics.

We deliberately do **not** do server-side MX-record lookups or use a paid third-party verifier — those add latency, cost, and a network dependency for catching maybe 1% more cases.

### The 6 rules

Every email goes through these checks, in order, before we enable the **Send magic link** button:

1. **Trim + lowercase** — leading/trailing whitespace removed, address lowercased. We never store mixed-case emails.
2. **Total length ≤ 254 characters** — RFC 5321 limit. Anything longer is junk.
3. **Format regex** — must match `^[^\s@]+@[^\s@]+\.[a-z]{2,}$`. Stricter than HTML5 `type="email"`, which accepts `a@b` with no TLD.
4. **No leading/trailing dots in the local-part** — `.foo@bar.com` and `foo.@bar.com` are invalid per RFC.
5. **No consecutive dots** — `foo..bar@x.co` is invalid.
6. **Not a disposable domain** — domain (after the `@`) is not in our blocklist.

A pass returns `{ ok: true, value: <normalized email> }`. A fail returns `{ ok: false, error: <user-facing message> }`.

### Where the validator lives

| Platform | File |
|---|---|
| Web | [ui/lib/validation/email.ts](../ui/lib/validation/email.ts) |
| Mobile | [mobile/src/lib/validation/email.ts](../mobile/src/lib/validation/email.ts) |

There is no shared package between web and mobile in this repo, so the function is **duplicated**. Keep the two files in sync when editing.

### Disposable domain blocklist

Small, curated list of the most common throwaway providers. Full blocklists with thousands of entries are available on GitHub, but they go stale fast and inflate bundle size — start small, add domains when we see them abused.

Current list:

```
mailinator.com
tempmail.com
guerrillamail.com
10minutemail.com
yopmail.com
trashmail.com
sharklasers.com
maildrop.cc
getnada.com
fakeinbox.com
```

To add a domain: edit `DISPOSABLE_DOMAINS` in both validator files above.

### User-facing error messages

Keep them short and actionable. Never echo back regex internals.

| Failure | Message |
|---|---|
| Empty / whitespace only | `Enter your email` |
| Too long | `Email is too long` |
| Format / dots / TLD | `Enter a valid email` |
| Disposable domain | `Disposable email addresses aren't allowed` |

The error renders directly below the input in muted-destructive color. The submit button stays disabled until the input passes.

### Test cases

| Input | Result |
|---|---|
| `  Foo@Bar.COM ` | `{ ok: true, value: "foo@bar.com" }` |
| `foo@bar.com` | `{ ok: true, value: "foo@bar.com" }` |
| `first.last+tag@sub.example.co.uk` | `{ ok: true, value: "first.last+tag@sub.example.co.uk" }` |
| `` (empty) | `Enter your email` |
| `foo` | `Enter a valid email` |
| `foo@bar` | `Enter a valid email` (no TLD) |
| `foo@bar.c` | `Enter a valid email` (TLD too short) |
| `.foo@bar.com` | `Enter a valid email` |
| `foo.@bar.com` | `Enter a valid email` |
| `foo..bar@x.co` | `Enter a valid email` |
| `foo bar@x.co` | `Enter a valid email` (whitespace inside) |
| `a@mailinator.com` | `Disposable email addresses aren't allowed` |
| `aaaaaa…` (>254 chars) | `Email is too long` |

When wiring this into a new screen, copy this table into the PR description and confirm each row by hand.

### What we deliberately do NOT do

- **No MX-record lookup.** Adds 100–500ms latency per keystroke or submit, doesn't work offline, and Resend's bounce handling already catches the long tail.
- **No "did you mean gmail.com?" typo correction.** Nice-to-have, not worth the bundle weight today. Revisit if support tickets show this is a real problem.
- **No server-side re-validation.** Supabase's auth endpoints will reject malformed addresses; we trust that boundary. If we ever expose a public signup API, add a server-side copy of `validateEmail` there.
- **No blocking by TLD or country.** We accept any 2+ character TLD, including new ones (`.xyz`, `.app`, `.dev`).

---

## Part 3 — Enabling email OTP in Supabase

Email OTP must be enabled in **both** the local Supabase stack (used during development) and the hosted Supabase project (used in prod). Skipping either side means OTP fails on that environment.

### Local Supabase (`supabase/config.toml`)

The local stack is configured via [supabase/config.toml](../supabase/config.toml). Make sure the following are set:

```toml
[auth]
enable_signup = true

[auth.email]
enable_signup = true
enable_confirmations = false   # OTP is the confirmation; no extra step needed
otp_length = 6
otp_expiry = 3600              # 1 hour, matches our UI copy
```

Apply changes by restarting the local stack:

```bash
supabase stop
supabase start
```

**Local email delivery:** the local stack does NOT call Resend. Emails are captured by Inbucket and viewable at `http://127.0.0.1:54324`. The OTP link in those emails redirects back to `http://localhost:3000/auth/callback` (web) or `infinityfinances://auth/callback` (mobile).

If you want to test the real Resend → inbox flow locally, point the local stack at Resend SMTP by uncommenting and filling in `[auth.email.smtp]` in `config.toml` — but for day-to-day dev, Inbucket is faster.

### Hosted Supabase (dashboard)

1. Authentication → Providers → **Email** → toggle ON.
2. Authentication → Providers → **Email** → ensure **"Enable email OTP"** is on, **"Confirm email"** is off (the OTP is the confirmation).
3. Authentication → Email Templates → **Magic Link** template — confirm the body contains `{{ .ConfirmationURL }}` and the subject matches our branding.
4. Project Settings → Authentication → **SMTP Settings** → set custom SMTP to Resend:
   - Host: `smtp.resend.com`
   - Port: `465` (SSL) or `587` (STARTTLS)
   - Username: `resend`
   - Password: your Resend API key
   - Sender email: a verified domain in your Resend account
5. Save.

### Redirect URLs (both environments)

Authentication → URL Configuration → **Redirect URLs** — must include every callback URL the app uses:

```
http://localhost:3000/auth/callback
https://your-prod-domain.com/auth/callback
infinityfinances://auth/callback
```

Missing any one of these causes the magic link to land on a Supabase error page instead of returning to the app.

### Disable Google + Apple providers (optional cleanup)

Since the UI no longer calls them, the providers can stay enabled with no effect. If you want a fully clean state:

- Hosted Supabase → Authentication → Providers → **Google** → toggle OFF.
- Hosted Supabase → Authentication → Providers → **Apple** → toggle OFF.
- Local `supabase/config.toml` → set `enabled = false` under `[auth.external.google]` and `[auth.external.apple]`.

Leave the credentials populated either way so re-enabling is a single toggle.

---

## Status

| Item | Status |
|---|---|
| Disable Google sign-in on web | ✅ Done |
| Disable Apple sign-in on web | ✅ Done |
| Disable Google sign-in on mobile | ✅ Done |
| Add email OTP flow on mobile | ✅ Done |
| Add `validateEmail` util (web) | ✅ Done |
| Add `validateEmail` util (mobile) | ✅ Done |
| Wire validation into web login | ✅ Done |
| Wire validation into mobile login | ✅ Done |
| Enable email OTP in local `supabase/config.toml` | ✅ Done — `[auth.email]` configured; `[auth.external.{apple,google}]` set to `enabled = false` |
| Enable email OTP in hosted Supabase dashboard | ⬜ Manual — needs dashboard access |
| Configure Resend SMTP in hosted Supabase | ⬜ Manual — needs dashboard access |
| Add `infinityfinances://auth/callback` to Supabase redirect URLs | ⬜ Manual — needs dashboard access |
| Build + typecheck (web + mobile) | ✅ Done |

Update this table as items land.

---

## When to revisit

- Bounce rate from Resend climbs above ~3% → tighten validation rules or add a typo-correction library.
- A disposable provider we don't list shows up repeatedly in abuse reports → add it to the blocklist.
- Product decides to bring back social login → follow the "How to re-enable later" steps above; the validation rules in Part 2 still apply to any email input on those flows.
