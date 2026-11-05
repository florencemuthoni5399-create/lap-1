import { useState, useCallback, useEffect } from 'react';
import { Play, Pause, Activity, RefreshCw } from 'lucide-react';
import ChartCanvas from '@/components/ChartCanvas';
import AccountPanel from '@/components/AccountPanel';
import StrategyPanel from '@/components/StrategyPanel';
import RiskPanel from '@/components/RiskPanel';
import IndicatorsPanel from '@/components/IndicatorsPanel';
import MartingalePanel from '@/components/MartingalePanel';
import EnginePanel from '@/components/EnginePanel';
import { DEFAULT_ENGINE } from '@/lib/strategyEngine';
import TradeLog from '@/components/TradeLog';
import { useMarketSimulator } from '@/hooks/useMarketSimulator';
import { useDerivAPI, type DerivAccountType } from '@/hooks/useDerivAPI';
import type { StrategySettings, RiskSettings, IndicatorSettings, MartingaleSettings, EngineSettings } from '@/types';

export default function Home() {
  const [isRunning, setIsRunning] = useState(false);
  const [isRealMode, setIsRealMode] = useState(false);
  const [appId, setAppId] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [accountType, setAccountType] = useState<DerivAccountType>('demo');
  
  const [strategy, setStrategy] = useState<StrategySettings>({
    strategy: 'Smart Barrier',
    asset: 'R_75',
    type: 'RESET CALL',
    stake: 5,
  });

  const [risk, setRisk] = useState<RiskSettings>({
    enabled: true,
    maxDailyLoss: 150,
    maxConsecutiveLosses: 3,
    cooldownSeconds: 60,
    dailyWinTarget: 75,
  });

  const [indicators, setIndicators] = useState<IndicatorSettings>({
    enabled: true,
    emaShort: 5,
    emaLong: 13,
    adxPeriod: 14,
    adxMin: 26,
    adxDynamic: false,
    atrPeriod: 14,
    atrAvgPeriod: 50,
    rsiPeriod: 14,
    bbEnabled: true,
    bbPeriod: 20,
    bbDeviation: 2,
    vwapEnabled: true,
    signalLookback: 300,
  });

  const [martingale, setMartingale] = useState<MartingaleSettings>({
    enabled: false,
    maxLevels: 3,
    baseStake: 5,
    multiplier: 2,
  });

  const [engine, setEngine] = useState<EngineSettings>(DEFAULT_ENGINE);

  // Staking mode and the Martingale switch describe the same choice - keep them in sync.
  const handleEngineChange = useCallback((next: EngineSettings) => {
    setEngine(next);
    setMartingale(prev => ({ ...prev, enabled: next.stakingMode === 'martingale' }));
  }, []);
  const handleMartingaleChange = useCallback((next: MartingaleSettings) => {
    setMartingale(next);
    setEngine(prev => {
      if (next.enabled) return { ...prev, stakingMode: 'martingale' };
      return prev.stakingMode === 'martingale' ? { ...prev, stakingMode: 'fixed' } : prev;
    });
  }, []);

  const [chartSettings, setChartSettings] = useState({
    showEma: true,
    showBollinger: true,
    showVwap: true,
  });

  // Simulation mode hook
  const sim = useMarketSimulator(
    indicators,
    martingale,
    risk,
    engine,
    strategy.stake,
    isRunning && !isRealMode
  );

  // Real Deriv API hook
  const deriv = useDerivAPI(
    appId || null,
    apiToken || null,
    accountType,
    isRunning && isRealMode,
    strategy.asset,
    strategy.stake,
    martingale,
    risk,
    indicators,
    engine
  );

  // Use the active mode's data
  const activeTicks = isRealMode ? deriv.ticks : sim.ticks;
  const activePrice = isRealMode ? deriv.currentPrice : sim.currentPrice;
  const activeTrades = isRealMode ? deriv.trades : sim.trades;
  const activeStats = isRealMode ? deriv.stats : sim.stats;
  const activeBalance = isRealMode && deriv.account ? deriv.account.balance : sim.balance;
  const activeDecision = isRealMode ? deriv.decision : sim.decision;

  // Reset stats when switching modes
  const handleReset = useCallback(() => {
    sim.resetStats();
    deriv.resetStats();
  }, [sim, deriv]);

  // Stop bot when switching modes
  const handleToggleMode = useCallback((real: boolean) => {
    setIsRunning(false);
    setIsRealMode(real);
    handleReset();
  }, [handleReset]);

  // Auto-stop when max loss or win target hit (in real mode)
  useEffect(() => {
    if (isRealMode && isRunning && deriv.account) {
      if (risk.enabled && (
        risk.maxDailyLoss > 0 || risk.dailyWinTarget > 0
      )) {
        // Check would be handled in the hook
      }
    }
  }, [isRealMode, isRunning, deriv.account, risk]);

  const handleConnect = useCallback(() => {
    if (!appId.trim()) {
      alert('Please enter your Deriv App ID (register one at api.deriv.com)');
      return;
    }
    if (!apiToken.trim()) {
      alert('Please enter your Deriv API token');
      return;
    }
    // The hook will auto-connect when appId/apiToken change
  }, [appId, apiToken]);

  return (
    <div className="h-screen flex flex-col bg-[#0b0e11] overflow-hidden">
      {/* Top Navigation Bar */}
      <header className="h-12 bg-[#151a21] border-b border-[#2a2f36] flex items-center justify-between px-4 shrink-0">
        <div className="flex items-center gap-3">
          <Activity className="w-5 h-5 text-[#2563eb]" />
          <span className="text-sm font-bold text-[#2563eb] tracking-wide">SYNTHTRADE</span>
          <span className="text-[10px] text-[#475569] bg-[#1c2128] px-2 py-0.5 rounded-full">PRO</span>
          {isRealMode && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
              deriv.account?.accountType === 'demo'
                ? 'bg-[#22c55e]/20 text-[#22c55e]' 
                : 'bg-[#f59e0b]/20 text-[#f59e0b]'
            }`}>
              {deriv.account?.accountType === 'demo' ? 'DEMO' : deriv.account ? 'REAL MONEY' : '...'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              isRunning 
                ? 'bg-[#22c55e] animate-pulse-dot' 
                : 'bg-[#475569]'
            }`} />
            <span className="text-xs text-[#94a3b8]">
              {isRunning 
                ? `Connected to ${strategy.asset}` 
                : 'Bot Stopped'
              }
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium bg-[#1c2128] text-[#94a3b8] border border-[#2a2f36] hover:bg-[#2a2f36] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
            <div className="text-right">
              <span className="text-[10px] text-[#475569] block">
                {isRealMode && deriv.account ? deriv.account.currency : 'USD'} Balance
              </span>
              <span className="text-sm font-mono font-semibold text-white">
                {isRealMode && deriv.account 
                  ? `${deriv.account.currency} ${deriv.account.balance.toFixed(2)}`
                  : `$${activeBalance.toFixed(2)}`
                }
              </span>
            </div>
            <button
              onClick={() => setIsRunning(!isRunning)}
              className={`flex items-center gap-2 px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                isRunning
                  ? 'bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/40 hover:bg-[#ef4444]/30'
                  : 'bg-[#22c55e]/20 text-[#22c55e] border border-[#22c55e]/40 hover:bg-[#22c55e]/30'
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" />
                  STOP
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  START
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1fr_380px] min-h-0">
        {/* Left: Chart + Trade Log */}
        <div className="flex flex-col min-h-0">
          {/* Chart */}
          <div className="flex-1 min-h-0 relative">
            <ChartCanvas
              ticks={activeTicks}
              indicators={indicators}
              showEma={chartSettings.showEma}
              showBollinger={chartSettings.showBollinger}
              showVwap={chartSettings.showVwap}
              currentPrice={activePrice}
            />
          </div>

          {/* Trade Log */}
          <TradeLog trades={activeTrades} stats={activeStats} />
        </div>

        {/* Right: Control Deck */}
        <div className="bg-[#151a21] border-l border-[#2a2f36] overflow-y-auto">
          {/* Account Connection */}
          <AccountPanel
            isRealMode={isRealMode}
            onToggleMode={handleToggleMode}
            connectionState={deriv.connectionState}
            account={deriv.account}
            appId={appId}
            onAppIdChange={setAppId}
            apiToken={apiToken}
            onTokenChange={setApiToken}
            accountType={accountType}
            onAccountTypeChange={setAccountType}
            onConnect={handleConnect}
            onDisconnect={deriv.disconnect}
            error={deriv.error}
          />

          <StrategyPanel settings={strategy} onChange={setStrategy} />
          <RiskPanel settings={risk} onChange={setRisk} />
          <IndicatorsPanel settings={indicators} onChange={setIndicators} />
          <EnginePanel
            settings={engine}
            onChange={handleEngineChange}
            decision={activeDecision}
            livePayout={deriv.livePayout}
            isRealMode={isRealMode}
          />
          <MartingalePanel settings={martingale} onChange={handleMartingaleChange} />
          
          {/* Chart Overlays Control */}
          <div className="p-4 border-b border-[#2a2f36]">
            <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Chart Overlays</h2>
            <div className="space-y-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chartSettings.showEma}
                  onChange={(e) => setChartSettings(prev => ({ ...prev, showEma: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-[#2a2f36] bg-[#1c2128] text-[#2563eb] focus:ring-[#2563eb]"
                />
                <span className="text-xs text-[#94a3b8]">EMA Crossover</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chartSettings.showBollinger}
                  onChange={(e) => setChartSettings(prev => ({ ...prev, showBollinger: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-[#2a2f36] bg-[#1c2128] text-[#a371f7] focus:ring-[#a371f7]"
                />
                <span className="text-xs text-[#94a3b8]">Bollinger Bands</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={chartSettings.showVwap}
                  onChange={(e) => setChartSettings(prev => ({ ...prev, showVwap: e.target.checked }))}
                  className="w-3.5 h-3.5 rounded border-[#2a2f36] bg-[#1c2128] text-[#f59e0b] focus:ring-[#f59e0b]"
                />
                <span className="text-xs text-[#94a3b8]">VWAP</span>
              </label>
            </div>
          </div>

          {/* Session Time Filter */}
          <div className="p-4 border-b border-[#2a2f36]">
            <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider mb-3">Session Filter</h2>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-[#1c2128] border border-[#22c55e]/40 rounded-md p-2 text-center">
                <div className="text-[10px] text-[#22c55e] font-semibold">UTC 08-16</div>
                <div className="text-[9px] text-[#475569]">High Vol</div>
                <div className="text-[9px] text-[#22c55e]">Trade</div>
              </div>
              <div className="bg-[#1c2128] border border-[#f59e0b]/40 rounded-md p-2 text-center">
                <div className="text-[10px] text-[#f59e0b] font-semibold">UTC 16-00</div>
                <div className="text-[9px] text-[#475569]">Moderate</div>
                <div className="text-[9px] text-[#f59e0b]">50% Stake</div>
              </div>
              <div className="bg-[#1c2128] border border-[#ef4444]/40 rounded-md p-2 text-center">
                <div className="text-[10px] text-[#ef4444] font-semibold">UTC 00-08</div>
                <div className="text-[9px] text-[#475569]">Low Vol</div>
                <div className="text-[9px] text-[#ef4444]">No Trade</div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 text-center">
            <p className="text-[10px] text-[#475569]">
              SynthTrade Pro v2.2 — Simulation + Real Trading
            </p>
            <p className="text-[9px] text-[#475569] mt-0.5">
              {isRealMode 
                ? 'Connected to Deriv WebSocket API' 
                : 'Simulation mode — No real money at risk'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
