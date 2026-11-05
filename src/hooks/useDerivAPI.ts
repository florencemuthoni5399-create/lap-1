import { useRef, useEffect, useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { evaluate } from '@/lib/strategyEngine';
import type {
  Tick, Trade, MartingaleSettings, RiskSettings, IndicatorSettings, EngineSettings, Decision,
} from '@/types';

// ---------------------------------------------------------------------------
// Deriv API - current (2026) architecture
//   1. REST: GET  /trading/v1/options/accounts          (Bearer PAT/OAuth token + Deriv-App-ID)
//   2. REST: POST /trading/v1/options/accounts/{id}/otp  -> { data: { url } }
//   3. WS:   new WebSocket(url)  (URL carries a one-time password; no authorize message)
// Docs: https://developers.deriv.com/docs/workflows/
// ---------------------------------------------------------------------------

const REST_BASE = 'https://api.derivws.com';
const MAX_TICKS = 300;
const PAYOUT_REFRESH_MS = 60_000;

export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'authenticated' | 'error';
export type DerivAccountType = 'demo' | 'real';

export interface DerivAccount {
  accountId: string;
  balance: number;
  currency: string;
  accountType: DerivAccountType;
  status: string;
}

interface PendingContract {
  tradeId: string;
  contractId: number;
  stake: number;
  level: number;
}

export function useDerivAPI(
  appId: string | null,
  apiToken: string | null,
  accountType: DerivAccountType,
  isRunning: boolean,
  symbol: string,
  baseStake: number,
  martingale: MartingaleSettings,
  risk: RiskSettings,
  indicators: IndicatorSettings,
  engine: EngineSettings
) {
  const wsRef = useRef<WebSocket | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [account, setAccount] = useState<DerivAccount | null>(null);
  const [ticks, setTicks] = useState<Tick[]>([]);
  const [currentPrice, setCurrentPrice] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState({ totalTrades: 0, wins: 0, losses: 0, netProfit: 0, winRate: 0 });
  const [error, setError] = useState<string | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [livePayout, setLivePayout] = useState<number | null>(null);

  const ticksRef = useRef<Tick[]>([]);
  const lastTradeTimeRef = useRef(0);
  const consecutiveLossesRef = useRef(0);
  const dailyLossRef = useRef(0);
  const dailyProfitRef = useRef(0);
  const martingaleLevelRef = useRef(0);
  const cooldownUntilRef = useRef(0);
  const reqIdRef = useRef(1);
  const authedRef = useRef(false);
  const accountRef = useRef<DerivAccount | null>(null);
  const payoutRef = useRef<number | null>(null);
  const lastProposalRef = useRef(0);
  const historyReqRef = useRef(-1);
  const proposalReqRef = useRef(-1);

  const pendingByReqIdRef = useRef<Map<number, PendingContract>>(new Map());
  const pendingByContractIdRef = useRef<Map<number, PendingContract>>(new Map());
  const openContractCountRef = useRef(0);

  // Latest settings, readable from inside the long-lived WebSocket handlers.
  // (Previously these were effect dependencies, which tore down and re-opened the socket - burning a
  // single-use OTP - every time connectionState, risk or martingale changed.)
  const cfgRef = useRef({ isRunning, baseStake, martingale, risk, indicators, engine });
  useEffect(() => { cfgRef.current = { isRunning, baseStake, martingale, risk, indicators, engine }; });

  const nextReqId = useCallback(() => reqIdRef.current++, []);

  const send = useCallback((data: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
      return true;
    }
    return false;
  }, []);

  const martingaleActive = () =>
    cfgRef.current.engine.stakingMode === 'martingale' && cfgRef.current.martingale.enabled;

  const settleContract = useCallback((pc: PendingContract, won: boolean, profit: number) => {
    const { martingale: m, risk: r } = cfgRef.current;
    setTrades(prev => prev.map(t => (t.id === pc.tradeId ? { ...t, result: won ? 'win' : 'loss', profit } : t)));

    if (won) {
      consecutiveLossesRef.current = 0;
      martingaleLevelRef.current = 0;
      dailyProfitRef.current += profit;
    } else {
      consecutiveLossesRef.current++;
      dailyLossRef.current += pc.stake;
      if (martingaleActive() && martingaleLevelRef.current < m.maxLevels - 1) {
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
    openContractCountRef.current = Math.max(0, openContractCountRef.current - 1);
    pendingByContractIdRef.current.delete(pc.contractId);
  }, []);

  useEffect(() => {
    if (!apiToken || !appId) {
      setConnectionState('disconnected');
      return;
    }

    let cancelled = false;
    let ws: WebSocket | null = null;
    setConnectionState('connecting');
    setError(null);
    authedRef.current = false;

    const requestPayout = () => {
      const { engine: eng } = cfgRef.current;
      lastProposalRef.current = Date.now();
      const id = nextReqId();
      proposalReqRef.current = id;
      send({
        proposal: 1,
        amount: 1,
        basis: 'stake',
        contract_type: 'CALL',
        currency: accountRef.current?.currency || 'USD',
        duration: eng.horizonTicks,
        duration_unit: 't',
        underlying_symbol: symbol,
        req_id: id,
      });
    };

    const tryTrade = () => {
      const { isRunning: running, baseStake: base, martingale: m, risk: r, indicators: ind, engine: eng } = cfgRef.current;
      if (!running || !authedRef.current) return;
      if (openContractCountRef.current > 0) return; // wait for the real settlement
      const now = Date.now();
      if (now < cooldownUntilRef.current) return;
      if (r.enabled) {
        if (dailyLossRef.current >= r.maxDailyLoss) return;
        if (dailyProfitRef.current >= r.dailyWinTarget) return;
        if (consecutiveLossesRef.current >= r.maxConsecutiveLosses) return;
      }
      if (now - lastTradeTimeRef.current < 3000) return;

      const bankroll = accountRef.current?.balance ?? 0;
      const fallbackStake = martingaleActive() ? base * Math.pow(m.multiplier, martingaleLevelRef.current) : base;
      // Use the broker's real payout when we have it; otherwise the configured one.
      const effective: EngineSettings = payoutRef.current ? { ...eng, payoutRatio: payoutRef.current } : eng;
      const d = evaluate(ticksRef.current.map(t => t.price), ind, effective, { bankroll, fallbackStake });
      setDecision(d);
      if (d.action !== 'trade' || !d.direction) return;

      const stake = Math.round(Math.min(d.stake, bankroll) * 100) / 100;
      if (stake <= 0) return;
      const level = martingaleLevelRef.current;
      const tradeId = uuidv4();
      const trade: Trade = {
        id: tradeId,
        time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        type: d.direction, asset: symbol, stake, result: 'pending', profit: 0, level,
      };
      const buyReqId = nextReqId();
      const sent = send({
        buy: '1',
        price: stake,
        parameters: {
          underlying_symbol: symbol,
          contract_type: d.direction,
          duration: eng.horizonTicks,
          duration_unit: 't',
          currency: accountRef.current?.currency || 'USD',
          basis: 'stake',
          amount: stake,
        },
        req_id: buyReqId,
      });
      if (!sent) return;
      setTrades(prev => [trade, ...prev].slice(0, 100));
      openContractCountRef.current += 1;
      pendingByReqIdRef.current.set(buyReqId, { tradeId, contractId: -1, stake, level });
      lastTradeTimeRef.current = now;
    };

    (async () => {
      try {
        const accRes = await fetch(`${REST_BASE}/trading/v1/options/accounts`, {
          headers: { 'Deriv-App-ID': appId, 'Authorization': `Bearer ${apiToken}` },
        });
        const accJson = await accRes.json();
        if (!accRes.ok) throw new Error(accJson?.errors?.[0]?.message || 'Failed to fetch Deriv accounts');
        const accounts: Array<{ account_id: string; balance: number; currency: string; account_type: DerivAccountType; status: string }> = accJson.data || [];
        const match = accounts.find(a => a.account_type === accountType && a.status === 'active')
          ?? accounts.find(a => a.account_type === accountType);
        if (!match) throw new Error(`No ${accountType} account found for this token/app ID`);
        if (cancelled) return;
        const acct: DerivAccount = {
          accountId: match.account_id, balance: match.balance, currency: match.currency,
          accountType: match.account_type, status: match.status,
        };
        accountRef.current = acct;
        setAccount(acct);

        const otpRes = await fetch(`${REST_BASE}/trading/v1/options/accounts/${match.account_id}/otp`, {
          method: 'POST',
          headers: { 'Deriv-App-ID': appId, 'Authorization': `Bearer ${apiToken}` },
        });
        const otpJson = await otpRes.json();
        if (!otpRes.ok) throw new Error(otpJson?.errors?.[0]?.message || 'Failed to obtain WebSocket session (OTP)');
        const wsUrl: string | undefined = otpJson.data?.url;
        if (!wsUrl) throw new Error('Deriv did not return a WebSocket URL');
        if (cancelled) return;

        ws = new WebSocket(wsUrl);
        wsRef.current = ws;
        setConnectionState('connected');

        ws.onopen = () => {
          if (cancelled) return;
          authedRef.current = true;
          setConnectionState('authenticated');
          send({ balance: 1, subscribe: 1, req_id: nextReqId() });
          // Warm start: pull recent history so the signal replay has data immediately.
          historyReqRef.current = nextReqId();
          send({ ticks_history: symbol, count: MAX_TICKS, end: 'latest', style: 'ticks', req_id: historyReqRef.current });
          send({ ticks: symbol, subscribe: 1, req_id: nextReqId() });
          requestPayout();
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);

            if (data.error) {
              // Optional requests must never break the bot.
              if (data.req_id === historyReqRef.current || data.req_id === proposalReqRef.current) {
                console.warn('[Deriv] optional request failed:', data.error);
                return;
              }
              // A rejected buy must release its slot, or the bot would wait forever for a settlement.
              const failed = pendingByReqIdRef.current.get(data.req_id);
              if (failed) {
                pendingByReqIdRef.current.delete(data.req_id);
                openContractCountRef.current = Math.max(0, openContractCountRef.current - 1);
                setTrades(prev => prev.filter(t => t.id !== failed.tradeId));
                lastTradeTimeRef.current = Date.now() + 10_000; // back off 10s after a rejected buy
              }
              console.error('[Deriv] Error:', data.error);
              setError(data.error.message || 'Unknown error');
              return;
            }

            if (data.balance) {
              const bal = Number(data.balance.balance);
              if (accountRef.current) accountRef.current = { ...accountRef.current, balance: bal };
              setAccount(prev => (prev ? { ...prev, balance: bal } : prev));
            }

            if (data.msg_type === 'history' && data.history?.prices) {
              const prices: number[] = data.history.prices;
              const times: number[] = data.history.times || [];
              const hist: Tick[] = prices.map((p, i) => ({ price: Number(p), ts: (times[i] ?? 0) * 1000 }));
              const lastTs = hist.length ? hist[hist.length - 1].ts : 0;
              ticksRef.current = [...hist, ...ticksRef.current.filter(t => t.ts > lastTs)].slice(-MAX_TICKS);
              setTicks([...ticksRef.current]);
              if (ticksRef.current.length) setCurrentPrice(ticksRef.current[ticksRef.current.length - 1].price);
            }

            if (data.proposal && data.req_id === proposalReqRef.current) {
              const ask = Number(data.proposal.ask_price);
              const payout = Number(data.proposal.payout);
              if (ask > 0 && payout > ask) {
                payoutRef.current = payout / ask - 1;
                setLivePayout(payoutRef.current);
              }
            }

            if (data.tick) {
              const tick: Tick = { price: data.tick.quote, ts: data.tick.epoch * 1000 };
              ticksRef.current = [...ticksRef.current, tick].slice(-MAX_TICKS);
              setTicks([...ticksRef.current]);
              setCurrentPrice(tick.price);
              if (Date.now() - lastProposalRef.current > PAYOUT_REFRESH_MS) requestPayout();
              tryTrade();
            }

            if (data.buy && data.req_id != null) {
              const pending = pendingByReqIdRef.current.get(data.req_id);
              if (pending) {
                pendingByReqIdRef.current.delete(data.req_id);
                const contractId = data.buy.contract_id as number;
                pendingByContractIdRef.current.set(contractId, { ...pending, contractId });
                send({ proposal_open_contract: 1, contract_id: contractId, subscribe: 1, req_id: nextReqId() });
              }
            }

            // Real settlement: the actual win/loss from Deriv.
            if (data.proposal_open_contract) {
              const poc = data.proposal_open_contract;
              const pending = pendingByContractIdRef.current.get(poc.contract_id as number);
              if (pending && poc.is_sold) {
                const won = poc.status === 'won';
                const profit = Math.round(Number(poc.profit) * 100) / 100;
                settleContract(pending, won, profit);
                const subId = poc.subscription?.id || data.subscription?.id;
                if (subId) send({ forget: subId, req_id: nextReqId() });
              }
            }
          } catch (e) {
            console.error('[Deriv] Parse error:', e);
          }
        };

        ws.onerror = () => {
          if (cancelled) return;
          setError('WebSocket connection error');
          setConnectionState('error');
        };
        ws.onclose = () => {
          if (cancelled) return;
          authedRef.current = false;
          setConnectionState('disconnected');
        };
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to connect to Deriv');
          setConnectionState('error');
        }
      }
    })();

    return () => {
      cancelled = true;
      authedRef.current = false;
      if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) ws.close();
    };
    // Only (re)connect when the connection identity changes. Everything else is read via refs.
  }, [apiToken, appId, accountType, symbol, send, nextReqId, settleContract]);

  const disconnect = useCallback(() => {
    const ws = wsRef.current;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) ws.close();
    wsRef.current = null;
    authedRef.current = false;
    accountRef.current = null;
    setConnectionState('disconnected');
    setAccount(null);
    ticksRef.current = [];
    setTicks([]);
    setCurrentPrice(0);
    pendingByReqIdRef.current.clear();
    pendingByContractIdRef.current.clear();
    openContractCountRef.current = 0;
  }, []);

  const resetStats = useCallback(() => {
    consecutiveLossesRef.current = 0;
    dailyLossRef.current = 0;
    dailyProfitRef.current = 0;
    martingaleLevelRef.current = 0;
    cooldownUntilRef.current = 0;
    lastTradeTimeRef.current = 0;
    setDecision(null);
    setTrades([]);
    setStats({ totalTrades: 0, wins: 0, losses: 0, netProfit: 0, winRate: 0 });
  }, []);

  return {
    connectionState, account, ticks, currentPrice, trades, stats, error,
    decision, livePayout, disconnect, resetStats, send,
  };
}
