# GUIDE01 SDK — TypeScript

Typed WASM protocol package (`@guide01/protocol`) plus a Web Bluetooth browser
demo.

## Requirements

- Node.js 18+ (the demo and tests use `node --test` / Vite)
- `npm install`
- The prebuilt `libs/wasm/libguide01_protocol.wasm` must be present
  (override with `GUIDE01_WASM=/path/to/.wasm`).

## Build

```bash
cd typescript
npm install
npm run build        # tsc -> dist/
npm run typecheck    # types only
```

## Test (no BLE)

```bash
cd typescript
npm run build        # tests import dist/
npm test             # node --test
```

## Run the demo (Chrome / Edge)

Web Bluetooth is required, so the demo runs in a Chromium-based browser.

```bash
cd typescript/demo
npm install
npm run dev          # vite dev server
npm run build        # production build
```

## Layout

- `src/` — `index.ts`, `wasm.ts` (the `@guide01/protocol` package)
- `demo/` — `main.ts`, `ble.ts`, `index.html` (Web Bluetooth demo)
- `test/` — `protocol.test.mjs`
