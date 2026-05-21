# Deployment and iOS TestFlight Guide

This guide captures what needs to be in place to push the current local work, keep the web/API deployments healthy, and add an iOS TestFlight pipeline through GitHub Actions.

## Current Deployment Shape

- `ui/` deploys to Vercel.
- `api/` deploys to Railway.
- Supabase migrations deploy from `.github/workflows/supabase-migrate.yml`.
- `mobile/` is an Expo React Native app with an iOS bundle id of `com.infinityfinances.mobile`.
- The iOS project currently has Apple team id `T6GYVDW7V2` in `mobile/ios/InfinityFinances.xcodeproj/project.pbxproj`.

## Before Pushing

1. Review and stage the changed web, API, Supabase, and mobile files intentionally.
2. Keep generated output out of git:
   - `api/dist/`
   - `ui/.next/`
   - `mobile/ios/build/`
   - `mobile/ios/Pods/`
   - `mobile/.expo/`
   - local `.env` files
3. Fix dependency reproducibility before relying on CI.
   - The repo uses npm workspaces at the root for `ui`, `api`, and `mobile`.
   - Prefer committing the root `package-lock.json` and removing `package-lock.json` from `.gitignore`.
   - If the root lockfile is intentionally not committed, GitHub Actions should use `npm install` instead of `npm ci`.
4. Run a local validation pass:

```bash
npm run build --workspace=api
npm run build --workspace=ui
npm run typecheck --workspace=mobile
npm run test:parity --workspace=mobile
```

## iOS TestFlight Strategy

Use EAS Build and EAS Submit from GitHub Actions.

This is preferred over a raw macOS/Xcode workflow because EAS handles remote iOS build machines, signing credentials, provisioning profiles, and App Store Connect submission with less repo-specific signing machinery.

## One-Time Expo and Apple Setup

Run these from `mobile/` locally, where interactive prompts are available:

```bash
npx eas-cli login
npx eas-cli init
npx eas-cli build --platform ios --profile production
npx eas-cli credentials --platform ios
```

This should create or confirm:

- EAS project id in `mobile/app.json` under `expo.extra.eas.projectId`.
- `mobile/eas.json`.
- iOS distribution certificate.
- App Store provisioning profile.
- App Store Connect API key configuration for EAS Submit.

Create the app in App Store Connect before the first submit:

- Name: `Infinity Finances`
- Bundle ID: `com.infinityfinances.mobile`
- SKU: use a stable unique value, for example `com.infinityfinances.mobile`
- Platform: iOS
- Apple Team ID: `T6GYVDW7V2`

Record the App Store Connect app Apple ID. This is the `ascAppId` used by EAS Submit.

## Recommended `mobile/eas.json`

Add this file after `eas init`, then fill in `ascAppId`:

```json
{
  "cli": {
    "version": ">= 13.0.0",
    "appVersionSource": "remote"
  },
  "build": {
    "production": {
      "ios": {
        "resourceClass": "m-medium"
      },
      "autoIncrement": true,
      "environment": "production"
    }
  },
  "submit": {
    "production": {
      "ios": {
        "ascAppId": "REPLACE_WITH_APP_STORE_CONNECT_APPLE_ID"
      }
    }
  }
}
```

Also add an iOS build number to `mobile/app.json` if EAS does not add one automatically:

```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.infinityfinances.mobile",
      "buildNumber": "1"
    }
  }
}
```

## GitHub Actions Workflow

Create `.github/workflows/ios-testflight.yml`.

If the root lockfile is committed, use `npm ci`. If it remains ignored/uncommitted, use `npm install`.

```yaml
name: iOS TestFlight

on:
  workflow_dispatch:

concurrency:
  group: ios-testflight-${{ github.ref }}
  cancel-in-progress: false

jobs:
  testflight:
    name: Build and Submit iOS to TestFlight
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: package-lock.json

      - name: Setup Expo and EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: Install dependencies
        run: npm ci

      - name: Typecheck mobile
        run: npm run typecheck --workspace=mobile

      - name: Check web/mobile engine parity
        run: npm run test:parity --workspace=mobile

      - name: Build and submit to TestFlight
        working-directory: mobile
        run: eas build --platform ios --profile production --auto-submit --non-interactive
```

The initial checked-in workflow is manual-only because `ascAppId`, EAS project setup, and Apple credentials must be finished before automated TestFlight uploads will succeed.

After the first few TestFlight builds are stable, add this trigger:

```yaml
on:
  workflow_dispatch:
  push:
    branches: [main]
    paths:
      - "mobile/**"
      - "package.json"
      - "package-lock.json"
      - ".github/workflows/ios-testflight.yml"
```

## GitHub Secrets

Add these in GitHub:

`Settings -> Secrets and variables -> Actions -> Repository secrets`

Required for iOS:

- `EXPO_TOKEN`: Expo personal access token used by `expo/expo-github-action`.

Optional for Apple credential repair or fully non-interactive Apple auth:

- `EXPO_ASC_API_KEY_P8`: contents of the App Store Connect `.p8` key.
- `EXPO_ASC_KEY_ID`: App Store Connect API key id.
- `EXPO_ASC_ISSUER_ID`: App Store Connect issuer id.
- `EXPO_APPLE_TEAM_ID`: `T6GYVDW7V2`.
- `EXPO_APPLE_TEAM_TYPE`: `COMPANY_OR_ORGANIZATION` or `INDIVIDUAL`, depending on the Apple Developer account.

Already required by the existing Supabase migration workflow:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

## Expo/EAS Environment Variables

Add these in the Expo dashboard for the project, or create them with `eas env:create`.

Environment: `production`

- `EXPO_PUBLIC_API_URL`: the production Railway API URL.
- `EXPO_PUBLIC_SUPABASE_URL`: the Supabase project URL.
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: the Supabase anon key.

These are public client-side values. Do not put service role keys, database URLs, or private API keys in `EXPO_PUBLIC_*` variables.

Example commands:

```bash
cd mobile
npx eas-cli env:create --name EXPO_PUBLIC_API_URL --value https://your-api.up.railway.app --environment production --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_URL --value https://your-project.supabase.co --environment production --visibility plaintext
npx eas-cli env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-anon-key --environment production --visibility plaintext
```

## Vercel Environment Variables

Add these in:

`Vercel -> Project -> Settings -> Environment Variables`

Production:

- `NEXT_PUBLIC_API_URL`: the production Railway API URL.
- `NEXT_PUBLIC_SUPABASE_URL`: the Supabase project URL.
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: the Supabase anon key.

Only if Apple web sign-in is re-enabled:

- `NEXT_PUBLIC_APPLE_SERVICE_ID`

## Railway Environment Variables

Add these in:

`Railway -> API service -> Variables`

Required:

- `DATABASE_URL`: Supabase Postgres connection string.
- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key.
- `INTERNAL_SECRET`: random secret shared only with trusted internal callers.
- `UI_ORIGIN`: production Vercel origin, for example `https://your-app.vercel.app`.
- `GEMINI_API_KEY`: Gemini API key used by `api/src/routes/chat.ts`.

Optional:

- `GEMINI_MODEL`: defaults to `gemini-2.5-flash` if omitted.
- `SUPABASE_JWT_SECRET`: optional fallback for JWT verification if JWKS via `SUPABASE_URL` is not used.
- `PORT`: Railway usually injects this automatically.

## Supabase Secrets and Settings

Supabase is used by both web and mobile auth, plus the API database connection.

Confirm:

- Auth site URL points at the production Vercel URL.
- Auth redirect URLs include the web callback URL.
- Mobile auth redirect/deep-link settings are added before TestFlight auth testing.
- Migrations are current and `supabase db push` succeeds from GitHub Actions.

The existing migration workflow uses:

- `SUPABASE_ACCESS_TOKEN`
- `SUPABASE_DB_PASSWORD`
- `SUPABASE_PROJECT_ID`

## First TestFlight Release Checklist

1. Commit the deployment guide, mobile app, API, UI, and Supabase changes.
2. Push to a branch and open a PR.
3. Confirm Vercel preview deploy passes.
4. Confirm Railway deploy is healthy or manually deploy the API service.
5. Confirm Supabase migration workflow passes.
6. Add all GitHub, Vercel, Railway, EAS, Apple, and Supabase secrets/settings listed above.
7. Run the iOS TestFlight workflow manually.
8. In App Store Connect, wait for processing to complete.
9. Add the build to internal TestFlight testing.
10. Install via TestFlight and smoke test:
    - app launch
    - Supabase auth
    - API connectivity
    - retirement calculator
    - home calculator
    - budget/money screens
    - tracker screens
    - chat feature flag and chat call, if enabled

## Follow-Up Improvements

- Add a separate mobile CI workflow for PRs that runs typecheck and parity tests without building TestFlight.
- Add branch protection that requires web build, API build, mobile typecheck, and Supabase migration checks before merging.
- Add release notes generation for TestFlight builds.
- Add Android internal testing later using the same EAS project.
