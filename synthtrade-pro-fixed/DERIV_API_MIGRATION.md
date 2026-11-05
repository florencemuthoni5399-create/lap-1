# Deriv API migration notes

This app was updated to Deriv's current API architecture (as of Aug 2026).
The UI, indicators, strategy logic, martingale, risk panel, and chart are
unchanged from the original. Only `src/hooks/useDerivAPI.ts` (plus small
wiring in `AccountPanel.tsx` / `Home.tsx`) changed.

## What changed and why

Deriv retired the old flow of connecting directly to
`wss://ws.derivws.com/websockets/v3?app_id=...` and sending an `authorize`
message with your raw token. The current flow is REST-first:

1. `GET https://api.derivws.com/trading/v1/options/accounts`
   headers: `Deriv-App-ID: <your app id>`, `Authorization: Bearer <your token>`
   → returns your demo and real accounts.
2. `POST https://api.derivws.com/trading/v1/options/accounts/{accountId}/otp`
   (same headers) → `{ data: { url } }`, a WebSocket URL with a one-time
   password embedded, valid for ~120 seconds, single use.
3. `new WebSocket(url)` — this connection is already authenticated; no
   `authorize` message needed.

Reference: https://developers.deriv.com/docs/intro/api-overview/

## What you need before running this

- **A registered Deriv App ID.** The old shared test id (`1089`) is for
  anonymous/public market data only — it will not work for trading with a
  real token. Register your own app at https://api.deriv.com.
- **A Personal Access Token (PAT)** from your Deriv account
  (Account Settings → API Token), or set up OAuth 2.0 if you want a proper
  sign-in flow instead of manual token entry.
- Enter both the App ID and the token in the app's "Account Connection"
  panel, and pick **Demo** or **Real Money** — the new API requires you to
  explicitly choose which of your accounts to trade on.

## The other fix: real trade settlement

In the original code, once real trading was enabled, the bot placed a real
`buy` order on Deriv but decided win/loss for its own stats **and for
martingale stake-doubling** using `Math.random() > 0.38` — it never read
back the actual contract result. That meant the bot could double your stake
based on a fake "loss" that didn't match what actually happened to your
money (or vice versa).

This is now fixed: after `buy`, the app subscribes to
`proposal_open_contract` for that contract, waits for `is_sold`, and only
then updates the trade log, stats, and martingale level — using the real
`status` (`won`/`lost`) and `profit` fields from Deriv. A trade shows as
"pending" in the log until it actually settles, and the bot won't place a
new trade while one is still open (needed so martingale sizing reflects the
true previous outcome).

## Running it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
```

## A note on the strategy itself

The underlying "signal" is still just "follow the direction of the last
tick" (`isUptrend`) — that part of the original bot's logic was left
untouched, since it wasn't in scope for this update. It's a very simple
signal and, combined with martingale stake-doubling, can lose money quickly
in real trading. Consider testing extensively in **Demo** mode before ever
switching to Real Money.
