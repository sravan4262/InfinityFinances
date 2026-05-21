# Local Development Setup

Simple setup for running the web UI, API, Supabase, and Expo mobile app locally.

## Prerequisites

- Node.js 22+
- npm
- Supabase CLI
- Docker Desktop, required by `supabase start`
- Postgres CLI tools, for `psql`
- Xcode, only needed for iOS simulator/native runs
- Expo account, only needed for EAS builds and TestFlight

macOS install examples:

```bash
brew install node
brew install supabase/tap/supabase
brew install libpq
brew link --force libpq
```

Install Docker Desktop from Docker, then start it before running Supabase.

Confirm the tools are available:

```bash
node --version
npm --version
supabase --version
docker --version
psql --version
```

## Install

From the repo root:

```bash
npm install
```

## Supabase

Start local Supabase:

```bash
supabase start
```

Apply migrations:

```bash
npm run db:migrate
```

To reset local app schemas and re-apply migrations:

```bash
npm run db:reset
```

The migration script defaults to local Supabase Postgres:

```text
postgresql://postgres:postgres@127.0.0.1:54322/postgres
```

## API

Create `api/.env` from the example:

```bash
cp api/.env.example api/.env
```

For local Supabase, use:

```env
DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres
SUPABASE_URL=http://localhost:54321
INTERNAL_SECRET=dev-internal-secret
UI_ORIGIN=http://localhost:3000
PORT=4000
```

Optional for chat:

```env
GEMINI_API_KEY=your-gemini-api-key
```

Start the API:

```bash
npm run dev:api
```

API runs on:

```text
http://localhost:4000
```

## Web UI

Create `ui/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-or-project-publishable-key
```

Start the UI:

```bash
npm run dev:ui
```

UI runs on:

```text
http://localhost:3000
```

To run UI and API together:

```bash
npm run dev
```

## Mobile

Create `mobile/.env`:

```bash
cp mobile/.env.example mobile/.env
```

For iOS simulator, localhost usually works:

```env
EXPO_PUBLIC_API_URL=http://localhost:4000
EXPO_PUBLIC_SUPABASE_URL=http://localhost:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-or-project-publishable-key
```

For a physical phone, replace localhost with your Mac's LAN IP:

```env
EXPO_PUBLIC_API_URL=http://192.168.x.x:4000
EXPO_PUBLIC_SUPABASE_URL=http://192.168.x.x:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-local-or-project-publishable-key
```

Start Expo:

```bash
npm run dev:mobile
```

Useful mobile commands:

```bash
npm run ios --workspace=mobile
npm run android --workspace=mobile
npm run typecheck --workspace=mobile
npm run test:parity --workspace=mobile
```

## Quick Check

Run these before opening a PR:

```bash
npm run build --workspace=api
npm run build --workspace=ui
npm run typecheck --workspace=mobile
npm run test:parity --workspace=mobile
```

## Manual TestFlight Build

The EAS workflow is manual so we do not spend iOS build quota on every push.
Commit and push release-ready changes first, then trigger the workflow from
`mobile/`:

```bash
npx eas-cli workflow:run .eas/workflows/ios-testflight.yml
```

This uploads the current mobile project to EAS, runs mobile validation, builds
iOS with the `production` profile, and submits the build to TestFlight.

## Common Local Ports

- Web UI: `3000`
- API: `4000`
- Supabase API/Auth: `54321`
- Supabase Postgres: `54322`
- Supabase Studio: `54323`
- Expo Metro: `8081`
