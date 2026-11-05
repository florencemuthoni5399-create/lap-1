import { useRef, useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { evaluate } from '@/lib/strategyEngine';
import type {
  Tick, IndicatorSettings, Trade, MartingaleSettings, RiskSettings, EngineSettings, Decision,
} from '@/types';

const MAX_TICKS = 300;
export const SIM_START_BALANCE = 1240.5;

/**
 * Simulation mode. Prices come from a random walk (same model as before), but trades are now
 * settled against what that price path actually does `horizonTicks` later - the old
 * `Math.random() > 0.38` coin-flip (a fabricated 62% win rate) is gone, so the decision
 * pipeline is being tested against something real.
 *
 * NOTE: the walk below has a small built-in upward drift ((rand - 0.48) * 3.5). That is a real,
 * learnable edge for CALLs that does NOT exist on Deriv's synthetic indices. Set SIM_BIAS to 0.5
 * for a fair walk.
 */
const SIM_BIAS = 0.48;

export function useMarketSimulator(
  indicators: IndicatorSettings,
  martingale: MartingaleSettings,
  risk: RiskSettings,
  engine: EngineSettings,
  baseStake: number,
  isRunning: boolean
) {
  const ticksRef = useRef<Tick[]>([]);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(7500);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState({ totalTrades: 0, wins: 0, losses: 0, netProfit: 0, winRate: 0 });
  const [balance, setBalance] = useState(SIM_START_BALANCE);
  const [decision, setDecision] = useState<Decision | null>(null);

  const balanceRef = useRef(SIM_START_BALANCE);
  const tickCountRef = useRef(0);
  const lastTradeTimeRef = useRef(0);
  const consecutiveLossesRef = useRef(0);
  const dailyLossRef = useRef(0);
  const dailyProfitRef = useRef(0);
  const martingaleLevelRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const pendingRef = useRef<{
    id: string; entryCount: number; entryPrice: number; dir: 1 | -1; stake: number; level: number;
  } | null>(null);

  // Always read the latest settings inside the interval without restarting it.
  const cfgRef = useRef({ indicators, martingale, risk, engine, baseStake });
  useEffect(() => { cfgRef.current = { indicators, martingale, risk, engine, baseStake }; });

  const settle = useCallback((won: boolean, profit: number, stake: number, id: string) => {
    const { martingale: m, risk: r } = cfgRef.current;
    const useMartingale = cfgRef.current.engine.stakingMode === 'martingale' && m.enabled;
    setTrades(prev => prev.map(t => (t.id === id ? { ...t, result: won ? 'win' : 'loss', profit } : t)));
    balanceRef.current = Math.round((balanceRef.current + profit) * 100) / 100;
    setBalance(balanceRef.current);

    if (won) {
      consecutiveLossesRef.current = 0;
      martingaleLevelRef.current = 0;
      dailyProfitRef.current += profit;
    } else {
      consecutiveLossesRef.current++;
      dailyLossRef.current += stake;
      if (useMartingale && martingaleLevelRef.current < m.maxLevels - 1) {
        martingaleLevelRef.current++;
      } else {
        martingaleLevelRef.current = 0;
        if (r.enabled && r.cooldownSeconds > 0) cooldownUntilRef.current = Date.now() + r.cooldownSeconds * 1000;
      }
    }
    setStats(prev => {
      const total = prev.totalTrades + 1;
      const w = prev.wins + (won ? 1 : 0);
      return {
        totalTrades: total, wins: w, losses: total - w,
        netProfit: Math.round((prev.netProfit + profit) * 100) / 100,
        winRate: Math.round((w / total) * 1000) / 10,
      };
    });
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const { indicators: ind, martingale: m, risk: r, engine: eng, baseStake: base } = cfgRef.current;

      // ---- price step ----
      const lastPrice = ticksRef.current.length ? ticksRef.current[ticksRef.current.length - 1].price : 7500;
      const newPrice = lastPrice + (Math.random() - SIM_BIAS) * 3.5;
      const tick: Tick = { price: Math.round(newPrice * 100) / 100, ts: Date.now() };
      ticksRef.current = [...ticksRef.current, tick].slice(-MAX_TICKS);
      tickCountRef.current++;
      setTicks([...ticksRef.current]);
      setCurrentPrice(tick.price);

      // ---- settle the open trade against the real simulated path ----
      const pend = pendingRef.current;
      if (pend && tickCountRef.current - pend.entryCount >= eng.horizonTicks) {
        const won = (tick.price - pend.entryPrice) * pend.dir > 0; // a tie is a loss
        const profit = won ? Math.round(pend.stake * eng.payoutRatio * 100) / 100 : -pend.stake;
        pendingRef.current = null;
        settle(won, profit, pend.stake, pend.id);
        return;
      }
      if (pend) return; // one open trade at a time

      // ---- risk gates ----
      const now = Date.now();
      if (now < cooldownUntilRef.current) return;
      if (r.enabled) {
        if (dailyLossRef.current >= r.maxDailyLoss) return;
        if (dailyProfitRef.current >= r.dailyWinTarget) return;
        if (consecutiveLossesRef.current >= r.maxConsecutiveLosses) return;
      }
      if (now - lastTradeTimeRef.current < 2500) return;

      // ---- decision pipeline ----
      const useMartingale = eng.stakingMode === 'martingale' && m.enabled;
      const fallbackStake = useMartingale ? base * Math.pow(m.multiplier, martingaleLevelRef.current) : base;
      const d = evaluate(ticksRef.current.map(t => t.price), ind, eng, {
        bankroll: balanceRef.current, fallbackStake,
      });
      setDecision(d);
      if (d.action !== 'trade' || !d.direction) return;

      const stake = Math.min(Math.round(d.stake * 100) / 100, balanceRef.current);
      if (stake <= 0) return;
      const trade: Trade = {
        id: uuidv4(),
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: d.direction,
        asset: 'R_75',
        stake,
        result: 'pending',
        profit: 0,
        level: martingaleLevelRef.current,
      };
      pendingRef.current = {
        id: trade.id, entryCount: tickCountRef.current, entryPrice: tick.price,
        dir: d.direction === 'CALL' ? 1 : -1, stake, level: martingaleLevelRef.current,
      };
      lastTradeTimeRef.current = now;
      setTrades(prev => [trade, ...prev].slice(0, 100));
    }, 300);

    return () => clearInterval(interval);
  }, [isRunning, settle]);

  const resetStats = useCallback(() => {
    consecutiveLossesRef.current = 0;
    dailyLossRef.current = 0;
    dailyProfitRef.current = 0;
    martingaleLevelRef.current = 0;
    cooldownUntilRef.current = 0;
    lastTradeTimeRef.current = 0;
    pendingRef.current = null;
    balanceRef.current = SIM_START_BALANCE;
    setBalance(SIM_START_BALANCE);
    setDecision(null);
    setTrades([]);
    setStats({ totalTrades: 0, wins: 0, losses: 0, netProfit: 0, winRate: 0 });
  }, []);

  return { ticks, currentPrice, trades, stats, balance, decision, resetStats };
}
