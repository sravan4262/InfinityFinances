# Infinity Finances Mobile

Expo + React Native app for iOS and Android.

## Run

From the repo root:

```bash
npm install
npm run dev:mobile
```

Metro runs on `http://localhost:8081`.

For a physical phone, point the mobile app at the API through your Mac's LAN IP:

```bash
cp mobile/.env.example mobile/.env
# edit EXPO_PUBLIC_API_URL to match the IP Expo prints, for example:
# EXPO_PUBLIC_API_URL=http://192.168.5.200:4000
```

Run the API alongside Metro:

```bash
npm run dev --workspace=api
```

Useful workspace commands:

```bash
npm run typecheck --workspace=mobile
npm run ios --workspace=mobile
npm run android --workspace=mobile
```

## Current implementation

- Expo Router app shell
- Native light/dark theme tokens with persisted theme switching
- Shared mobile UI primitives
- Reused FIRE calculation engine copied from `ui/lib/engine`
- Bottom-tab shell for Retire, Home, Budget, and Tracker
- Shared persisted FIRE store reused across calculator routes
- Native Simple FIRE calculator with live preview
- Dedicated FIRE results screen
- Web/mobile FIRE engine parity fixtures
- First native Advanced FIRE wizard pass

The broader build plan is documented in [`docs/mobile-app-implementation-guide.md`](../docs/mobile-app-implementation-guide.md).
