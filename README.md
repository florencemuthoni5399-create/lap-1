# SynthTrade Pro v2.2

React + TypeScript + Vite trading-bot dashboard for Deriv synthetic indices, with a 4-layer
decision pipeline (value filter, false-signal filter, fractional Kelly, volatility/regime gate).

## Deploy on Render (static site)

1. Push this folder to a GitHub repo (the `render.yaml` Blueprint is in the root).
2. Render dashboard -> **New +** -> **Blueprint** -> pick the repo -> **Apply**.
   *(Or New + -> Static Site with: Build `npm ci && npm run build`, Publish directory `dist`,
   env var `NODE_VERSION=22.12.0`, and a rewrite rule `/*` -> `/index.html`.)*
3. Open the `.onrender.com` URL. Simulation mode works immediately.

For real/demo trading enter your **Deriv App ID** (registered at developers.deriv.com, PAT type) and a
**PAT** in the Account Connection panel. They are typed into your browser and sent only to Deriv;
they are not stored or sent to Render. Use a token with the narrowest scopes you can, start on **Demo**.

## Local

    npm install
    npm run dev        # http://localhost:3000
    npm run build      # -> dist/
    npx tsx scripts/engine-check.ts   # numeric sanity checks of the pipeline

See `PIPELINE.md` for how the pipeline works and `DERIV_API_MIGRATION.md` for the API flow.
