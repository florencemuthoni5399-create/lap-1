// Sanity checks for the decision pipeline.  Run: npx tsx scripts/engine-check.ts
import { evaluate, DEFAULT_ENGINE } from '../src/lib/strategyEngine';
import type { IndicatorSettings } from '../src/types';

const ind: IndicatorSettings = {
  enabled: true, emaShort: 5, emaLong: 13, adxPeriod: 14, adxMin: 26, adxDynamic: false,
  atrPeriod: 14, atrAvgPeriod: 50, rsiPeriod: 14, bbEnabled: true, bbPeriod: 20, bbDeviation: 2,
  vwapEnabled: true, signalLookback: 300,
};

function rng(seed: number) { // mulberry32
  return () => { seed |= 0; seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const gauss = (r: () => number) => Math.sqrt(-2 * Math.log(r() || 1e-9)) * Math.cos(2 * Math.PI * r());

type Gen = (r: () => number, n: number) => number[];
const fairWalk: Gen = (r, n) => { const p = [7500]; for (let i = 1; i < n; i++) p.push(p[i-1] + gauss(r)); return p; };
// simulator's own model: (rand-0.48)*3.5 per tick
const simWalk: Gen = (r, n) => { const p = [7500]; for (let i = 1; i < n; i++) p.push(p[i-1] + (r() - 0.48) * 3.5); return p; };
// momentum: returns have positive autocorrelation (phi), i.e. a real, exploitable edge
const momentum = (phi: number): Gen => (r, n) => { const p = [7500]; let prev = 0;
  for (let i = 1; i < n; i++) { const ret = phi * prev + gauss(r); prev = ret; p.push(p[i-1] + ret); } return p; };

function run(name: string, gen: Gen, seeds = 40, len = 900) {
  let evals = 0, trades = 0, stakeSum = 0, stakeMax = 0, wins = 0, settled = 0;
  const reasons: Record<string, number> = {};
  for (let s = 1; s <= seeds; s++) {
    const p = gen(rng(s * 7919), len);
    for (let t = 300; t < len - 6; t += 3) {
      const d = evaluate(p.slice(0, t + 1), ind, DEFAULT_ENGINE, { bankroll: 1000, fallbackStake: 5 });
      evals++;
      if (d.action === 'trade') {
        trades++; stakeSum += d.stake; stakeMax = Math.max(stakeMax, d.stake);
        const dir = d.direction === 'CALL' ? 1 : -1; settled++;
        if ((p[t + 5] - p[t]) * dir > 0) wins++;
      } else { const k = d.reason.replace(/[\d.]+/g, '#'); reasons[k] = (reasons[k] || 0) + 1; }
    }
  }
  console.log(`\n${name}\n  evaluations ${evals}, trades ${trades} (${(100*trades/evals).toFixed(2)}%)` +
    (trades ? `, avg stake $${(stakeSum/trades).toFixed(2)}, max $${stakeMax.toFixed(2)}, realised hit-rate ${(100*wins/settled).toFixed(1)}%` : ''));
  Object.entries(reasons).sort((a,b)=>b[1]-a[1]).slice(0,4).forEach(([k,v]) => console.log(`    skip x${v}: ${k}`));
}

run('Fair random walk (no edge exists)', fairWalk);
run('Simulator price model (small built-in upward drift)', simWalk);
run('Momentum market, phi=0.25 (real edge)', momentum(0.25));
run('Momentum market, phi=0.5 (strong edge)', momentum(0.5));
