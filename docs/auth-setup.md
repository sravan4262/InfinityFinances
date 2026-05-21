# Auth Setup — Google + Apple Sign-In

Google uses the **Supabase OAuth redirect** flow so the Google consent screen is branded by your OAuth application name. Apple still uses the native popup flow and exchanges the returned ID token via `signInWithIdToken`.

---

## What you need

| | Where it comes from | Used by |
|---|---|---|
| Google Client ID + Client Secret | Google Auth Platform → Clients | Supabase Google provider |
| `NEXT_PUBLIC_APPLE_SERVICE_ID`  | Apple Developer → Identifiers → Services ID | `<AppleSignInButton>` |
| Supabase project URL + anon key | Supabase Dashboard → Settings → API | both |

Both vars must start with `NEXT_PUBLIC_` so they're available in the browser.

---

## 1. Google

### 1a. Google Cloud Console (once)

1. Open https://console.cloud.google.com/apis/credentials → **Create credentials → OAuth client ID → Web application**.
2. Name: `Infinity Finances Web`.
3. **Authorized JavaScript origins** — add both:
   - `http://localhost:3000`
   - `https://your-prod-domain.com`
4. **Authorized redirect URIs** — add Supabase callback URLs:
   - local Supabase: `http://127.0.0.1:54321/auth/v1/callback`
   - hosted Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`
5. Save. Copy the **Client ID** (looks like `…apps.googleusercontent.com`).

### 1b. Supabase Dashboard (once)

1. Authentication → Providers → **Google** → toggle ON.
2. Paste the Client ID from step 1a into **Authorized Client IDs**.
3. Paste the matching Client Secret into **Client Secret**.
4. Save.

### 1c. Local config

For the local Supabase stack, provide the Google client credentials through the env vars referenced by `supabase/config.toml`:

```
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=123456789-abc.apps.googleusercontent.com
SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET=...
```

`NEXT_PUBLIC_GOOGLE_CLIENT_ID` is no longer needed by the web app.

---

## 2. Apple

Apple is more steps because they require a paid Apple Developer account ($99/yr) and a private key file. **Use the same Services ID for local and prod** — just add both origins to its allowed domains.

### 2a. Apple Developer Portal (once)

Go to https://developer.apple.com/account/resources/identifiers/list.

1. **App ID** → `+` → App IDs → App.
   - Description: `Infinity Finances`
   - Bundle ID: `com.infinityfinances.web` (reverse-DNS; never reused)
   - Capabilities: tick **Sign In with Apple**
   - Continue → Register.

2. **Services ID** → `+` → Services IDs.
   - Description: `Infinity Finances Web`
   - Identifier: `com.infinityfinances.web.signin` (this is what becomes `NEXT_PUBLIC_APPLE_SERVICE_ID`)
   - Continue → Register.
   - Edit it → tick **Sign In with Apple** → **Configure**:
     - Primary App ID: the one from step 1.
     - **Domains and Subdomains**: `localhost`, `your-prod-domain.com`
     - **Return URLs**: `http://localhost:3000/auth/callback`, `https://your-prod-domain.com/auth/callback`
     - *(The popup flow never actually navigates to these URLs, but Apple validates that they're registered before opening the popup.)*
   - Save → Continue → Register.

3. **Key** → `+` → Keys.
   - Key Name: `Infinity Finances Sign In Key`
   - Tick **Sign In with Apple** → Configure → pick the App ID from step 1.
   - Continue → Register → **Download the `.p8` file**. You can only download once — store it safely (1Password, etc.).
   - Note the **Key ID** (10 chars) and your **Team ID** (top-right of the developer portal).

### 2b. Supabase Dashboard

1. Authentication → Providers → **Apple** → toggle ON.
2. **Client ID**: paste the Services ID identifier (`com.infinityfinances.web.signin`).
3. **Secret Key (for OAuth)** — leave blank for now. *(Only needed if you also want the OAuth-redirect flow, e.g. on mobile. The popup flow doesn't use it.)*
4. Save.

### 2c. Local `.env.local`

```
NEXT_PUBLIC_APPLE_SERVICE_ID=com.infinityfinances.web.signin
```

Restart `npm run dev:ui`.

> **About the `.p8` key + client-secret JWT** — only needed if you turn on the standard `signInWithOAuth({ provider: 'apple' })` redirect flow later (mobile, server-side flows). For the browser popup flow we ship, Supabase validates the `id_token` directly against Apple's public JWKS — no secret needed. Keep the `.p8` safe in case you need it.

---

## 3. Final `.env.local` (template)

```
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>

# Backend
NEXT_PUBLIC_API_URL=http://localhost:4000

# AI chat
ANTHROPIC_API_KEY=…   # drop this if no Anthropic usage
# GEMINI_API_KEY lives in api/.env, not here

# Native sign-in providers
NEXT_PUBLIC_APPLE_SERVICE_ID=com.infinityfinances.web.signin
```

---

## 4. Test locally

```bash
npm run dev          # runs both ui (3000) and api (4000)
```

Open http://localhost:3000/auth/login.

- **Google button** → redirects through Supabase OAuth to Google → pick account → land back on `/` signed in.
- **Apple button** → opens Apple's popup → Face ID / password → land back on `/`.

Confirm in browser DevTools → Application → Cookies: a `sb-<ref>-auth-token` cookie should be set.

---

## 5. Common errors

| Error | Cause | Fix |
|---|---|---|
| `Apple sign-in is not configured.` | `NEXT_PUBLIC_APPLE_SERVICE_ID` missing | Add to `.env.local`, restart dev |
| `Passed nonce and nonce in id_token should either both exist or not.` (Apple) | Apple stamps the **hashed** nonce, Supabase needs the **raw** nonce | Already handled in [AppleSignInButton.tsx](../ui/components/features/auth/AppleSignInButton.tsx) — don't touch the `sha256Hex` call |
| `invalid_client` from Apple popup | Services ID not enabled for Sign In with Apple, or Domain not registered | Re-check step 2a — `localhost` must be in Domains list and `http://localhost:3000/auth/callback` in Return URLs |
| `redirect_uri_mismatch` from Google | Supabase callback URL missing | Add the local and hosted Supabase callback URLs from step 1a |
| Cookie set but `useUser()` still `null` | Supabase client not configured | Confirm `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set |

---

## 6. Production checklist

- [ ] Production domain added to **Google Cloud → Authorized JavaScript origins**
- [ ] Production domain + `/auth/callback` added to **Apple Service ID → Domains/Return URLs**
- [ ] Google Client ID + Client Secret configured in the hosted Supabase Google provider
- [ ] Same `NEXT_PUBLIC_APPLE_SERVICE_ID` set in your hosting platform env
- [ ] Supabase production project: providers enabled with the same Client IDs
- [ ] If you ever enable email confirmation, make sure both providers return verified emails so accounts auto-link to the same `auth.users.id`
