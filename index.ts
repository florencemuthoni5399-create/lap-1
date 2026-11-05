export interface Tick {
  price: number;
  ts: number;
}

export interface StrategySettings {
  strategy: string;
  asset: string;
  type: string;
  stake: number;
}

export interface RiskSettings {
  enabled: boolean;
  maxDailyLoss: number;
  maxConsecutiveLosses: number;
  cooldownSeconds: number;
  dailyWinTarget: number;
}

export interface IndicatorSettings {
  enabled: boolean;
  emaShort: number;
  emaLong: number;
  adxPeriod: number;
  adxMin: number;
  adxDynamic: boolean;
  atrPeriod: number;
  atrAvgPeriod: number;
  rsiPeriod: number;
  bbEnabled: boolean;
  bbPeriod: number;
  bbDeviation: number;
  vwapEnabled: boolean;
  signalLookback: number;
}

export interface MartingaleSettings {
  enabled: boolean;
  maxLevels: number;
  baseStake: number;
  multiplier: number;
}

export interface Trade {
  id: string;
  time: string;
  type: string;
  asset: string;
  stake: number;
  result: 'win' | 'loss' | 'pending';
  profit: number;
  level: number;
}

export interface ChartSettings {
  showEma: boolean;
  showBollinger: boolean;
  showVwap: boolean;
}

export interface Stats {
  totalTrades: number;
  wins: number;
  losses: number;
  netProfit: number;
  winRate: number;
}

export type StakingMode = 'fixed' | 'martingale' | 'kelly';

/** Settings for the 4-layer decision pipeline (see lib/strategyEngine.ts). */
export interface EngineSettings {
  enabled: boolean;
  // Layer 1 - EP-EL value filter
  payoutRatio: number;      // net profit per $1 staked on a win (0.95 = 95%)
  minEv: number;            // minimum expected value per $1 staked
  // Layer 2 - false-signal filter
  horizonTicks: number;     // contract duration in ticks
  minSamples: number;       // minimum resolved past signals before trusting the hit-rate
  maxFalseRate: number;     // reject if historical false-signal rate is above this
  persistTicks: number;     // signal direction must hold this many ticks
  minStrength: number;      // min |EMA gap| as a multiple of average tick move
  // Layer 3 - fractional Kelly
  stakingMode: StakingMode;
  kellyFraction: number;    // 0.25 = quarter Kelly
  kellyZ: number;           // z-score for the conservative (lower-bound) edge estimate
  maxStakePct: number;      // hard cap, % of bankroll per trade
  minStake: number;
  // Layer 4 - volatility / regime gate
  regimeEnabled: boolean;
  volRatioMin: number;
  volRatioMax: number;
  minEfficiency: number;    // Kaufman efficiency ratio (0..1), trendiness
}

export interface LayerResult {
  id: 'signal' | 'regime' | 'falseSignal' | 'value' | 'kelly';
  name: string;
  pass: boolean;
  skipped?: boolean;
  detail: string;
}

export interface Decision {
  action: 'trade' | 'skip';
  direction: 'CALL' | 'PUT' | null;
  stake: number;
  reason: string;
  layers: LayerResult[];
  metrics: {
    pHat: number | null;
    pLower: number | null;
    breakeven: number;
    ev: number | null;
    kelly: number | null;
    samples: number;
    volRatio: number | null;
    efficiency: number | null;
  };
}
