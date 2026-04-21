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

- Rewarded continue stub and native integration hook: [src/monetization.js](C:/SL/ailab/_capacitator/one-tap-tower/src/monetization.js)
- Remove Ads stub and Play Billing hook: [src/monetization.js](C:/SL/ailab/_capacitator/one-tap-tower/src/monetization.js)
- Platform detection and lifecycle glue: [src/platform.js](C:/SL/ailab/_capacitator/one-tap-tower/src/platform.js)
