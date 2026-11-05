# Decision pipeline (src/lib/strategyEngine.ts)

Evaluation order (value and signal checks run BEFORE staking):

    base signal -> L4 regime gate -> L2 false-signal filter -> L1 value filter -> L3 fractional Kelly

| Layer | What it does | Rejects when |
|---|---|---|
| Base signal | EMA cross + RSI 30-70 + Bollinger width + price vs running mean | no agreement |
| L4 Volatility / regime | short/long tick-volatility ratio and Kaufman efficiency ratio | vol outside band, or market too choppy |
| L2 False-signal | signal must have held N ticks; EMA gap must beat tick noise; past signals are replayed over the tick history and scored; the recent half must confirm out-of-sample | flipped just now, weak, too few samples, false-rate too high, recent half below break-even |
| L1 Value (EP-EL) | EV = p*b - (1-p) using the measured hit-rate p and payout b (live from Deriv in real mode) | EV below `minEv` |
| L3 Fractional Kelly | f* = (p_low*b - (1-p_low))/b on the Wilson lower bound of p (sample deflated by the contract length because consecutive signals overlap); stake = bankroll x f* x fraction, capped at % of balance | lower bound <= break-even (stake 0 -> no trade), or stake under the minimum |

Kelly never turns a rejected bet into an accepted one; it only sizes trades that already passed.

## What it can and cannot do
* It does not create an edge. If the signal has no real edge, the pipeline is designed to stand down.
* Break-even at a 0.95 payout is p = 51.3%. Measured on synthetic data, the EMA 5/13 signal alone was
  only ~51-53% accurate at a 5-tick horizon even in markets built with momentum, so expect long
  stretches with no trades on real synthetic indices.
* Filters reduce, but cannot eliminate, false positives (a fair random walk still passed ~0.1% of checks).
* Simulation mode's price walk has a built-in upward drift (`SIM_BIAS` in useMarketSimulator.ts) that
  Deriv's synthetic indices do not have. Set it to 0.5 for a fair walk.
