# One Tap Tower

One Tap Tower is a lightweight portrait stacking game built with vanilla HTML, CSS, and JavaScript on top of Vite, with Capacitor ready for Android packaging.

## Run In Browser

1. Install dependencies:

```bash
npm install
```

2. Start the dev server:

```bash
npm run dev
```

## Build Web Assets

```bash
npm run build
```

## Sync And Open Android

The `android/` project is already included. If you ever need to recreate it from scratch, run:

```bash
npm run android:add
```

Sync the latest web build into Android:

```bash
npm run cap:sync
```

Open Android Studio:

```bash
npm run cap:open
```

## Test

```bash
npm test
```

## Monetization TODOs

- Rewarded continue stub and native integration hook: [src/monetization.js](src/monetization.js)
- Remove Ads stub and Play Billing hook: [src/monetization.js](src/monetization.js)
- Platform detection and lifecycle glue: [src/platform.js](src/platform.js)

## Release builds (no Android Studio needed)

GitHub Actions (`.github/workflows/android.yml`) builds a release `.aab` on every push to `main` and on demand (Actions → Android build → Run workflow). Download it from the run's **Artifacts** and upload it in Play Console. Each run gets a new `versionCode` (the run number), so Play always accepts the next upload.

Signing uses four repository secrets: `ANDROID_KEYSTORE_BASE64` (the upload keystore, base64), `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. Without them the bundle is built unsigned, which Play rejects. Pull request builds are always unsigned and only check that the app builds.

Privacy policy for the store listing: [PRIVACY.md](PRIVACY.md).
