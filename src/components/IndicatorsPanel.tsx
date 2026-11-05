import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { IndicatorSettings } from '@/types';

interface IndicatorsPanelProps {
  settings: IndicatorSettings;
  onChange: (settings: IndicatorSettings) => void;
}

function StatusDot({ active }: { active: boolean }) {
  return (
    <div className={`w-2 h-2 rounded-full ${active ? 'bg-emerald-400' : 'bg-red-400'}`} />
  );
}

export default function IndicatorsPanel({ settings, onChange }: IndicatorsPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-b border-[#2a2f36]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1c2128]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#2563eb]" />
          <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Indicator Confluence</h2>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={settings.enabled}
            onCheckedChange={(checked) => onChange({ ...settings, enabled: checked })}
          />
          <ChevronDown
            className={`w-4 h-4 text-[#475569] transition-transform duration-300 ${expanded ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <motion.div
              initial={{ x: -10 }}
              animate={{ x: 0 }}
              transition={{ delay: 0.1 }}
              className="px-4 pb-4 space-y-4 border-l-2 border-l-[#2563eb]/30 ml-4"
            >
              {/* All five must agree note */}
              <p className="text-[10px] text-[#475569] italic">
                All five must agree: EMA + MACD + ADX + ATR + RSI
              </p>

              {/* EMA Module */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">EMA Crossover</span>
                  <StatusDot active={settings.enabled} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#475569] mb-0.5 block">EMA Short</label>
                    <input
                      type="number"
                      value={settings.emaShort}
                      onChange={(e) => onChange({ ...settings, emaShort: parseInt(e.target.value) || 5 })}
                      disabled={!settings.enabled}
                      className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#475569] mb-0.5 block">EMA Long</label>
                    <input
                      type="number"
                      value={settings.emaLong}
                      onChange={(e) => onChange({ ...settings, emaLong: parseInt(e.target.value) || 13 })}
                      disabled={!settings.enabled}
                      className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors disabled:opacity-40"
                    />
                  </div>
                </div>
              </div>

              {/* ADX Module */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">ADX Filter</span>
                  <StatusDot active={settings.enabled} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#475569] mb-0.5 block">ADX Period</label>
                    <input
                      type="number"
                      value={settings.adxPeriod}
                      onChange={(e) => onChange({ ...settings, adxPeriod: parseInt(e.target.value) || 14 })}
                      disabled={!settings.enabled}
                      className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#475569] mb-0.5 block">ADX Min</label>
                    <input
                      type="number"
                      value={settings.adxMin}
                      onChange={(e) => onChange({ ...settings, adxMin: parseInt(e.target.value) || 26 })}
                      disabled={!settings.enabled}
                      className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors disabled:opacity-40"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#475569]">
                  ADX &gt; {settings.adxMin} AND sloping up = trending market confirmed
                </p>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={settings.adxDynamic}
                    onCheckedChange={(checked) => onChange({ ...settings, adxDynamic: checked })}
                    disabled={!settings.enabled}
                  />
                  <span className="text-[10px] text-[#94a3b8]">Dynamic Threshold (20-35)</span>
                </div>
              </div>

              {/* ATR Module */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">ATR Filter</span>
                  <StatusDot active={settings.enabled} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-[#475569] mb-0.5 block">ATR Period</label>
                    <input
                      type="number"
                      value={settings.atrPeriod}
                      onChange={(e) => onChange({ ...settings, atrPeriod: parseInt(e.target.value) || 14 })}
                      disabled={!settings.enabled}
                      className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors disabled:opacity-40"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#475569] mb-0.5 block">ATR Avg Period</label>
                    <input
                      type="number"
                      value={settings.atrAvgPeriod}
                      onChange={(e) => onChange({ ...settings, atrAvgPeriod: parseInt(e.target.value) || 50 })}
                      disabled={!settings.enabled}
                      className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors disabled:opacity-40"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-[#475569]">
                  Trade only when ATR({settings.atrPeriod}) &gt; avg of last {settings.atrAvgPeriod} ticks
                </p>
              </div>

              {/* RSI Module */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-white">RSI Filter</span>
                  <StatusDot active={settings.enabled} />
                </div>
                <div>
                  <label className="text-[10px] text-[#475569] mb-0.5 block">RSI Period</label>
                  <input
                    type="number"
                    value={settings.rsiPeriod}
                    onChange={(e) => onChange({ ...settings, rsiPeriod: parseInt(e.target.value) || 14 })}
                    disabled={!settings.enabled}
                    className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors disabled:opacity-40"
                  />
                </div>
                <p className="text-[10px] text-[#475569]">
                  Skip CALLs if RSI &gt; 70 &middot; Skip PUTs if RSI &lt; 30
                </p>
              </div>

              {/* Bollinger Bands */}
              <div className="space-y-2 pt-2 border-t border-[#2a2f36]/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.bbEnabled}
                      onCheckedChange={(checked) => onChange({ ...settings, bbEnabled: checked })}
                      disabled={!settings.enabled}
                    />
                    <span className="text-xs font-medium text-white">Bollinger Bands</span>
                  </div>
                  <StatusDot active={settings.bbEnabled && settings.enabled} />
                </div>
                <AnimatePresence>
                  {settings.bbEnabled && settings.enabled && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[10px] text-[#475569] mb-0.5 block">BB Period</label>
                          <input
                            type="number"
                            value={settings.bbPeriod}
                            onChange={(e) => onChange({ ...settings, bbPeriod: parseInt(e.target.value) || 20 })}
                            className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#a371f7] transition-colors"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-[#475569] mb-0.5 block">Deviation</label>
                          <input
                            type="number"
                            value={settings.bbDeviation}
                            onChange={(e) => onChange({ ...settings, bbDeviation: parseFloat(e.target.value) || 2 })}
                            step={0.5}
                            className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#a371f7] transition-colors"
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* VWAP */}
              <div className="pt-2 border-t border-[#2a2f36]/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={settings.vwapEnabled}
                      onCheckedChange={(checked) => onChange({ ...settings, vwapEnabled: checked })}
                      disabled={!settings.enabled}
                    />
                    <span className="text-xs font-medium text-white">VWAP Confirmation</span>
                  </div>
                  <StatusDot active={settings.vwapEnabled && settings.enabled} />
                </div>
              </div>

              {/* Signal Lookback */}
              <div className="pt-2 border-t border-[#2a2f36]/50">
                <label className="text-[10px] text-[#475569] mb-1 block">Signal Lookback (ticks)</label>
                <input
                  type="number"
                  value={settings.signalLookback}
                  onChange={(e) => onChange({ ...settings, signalLookback: parseInt(e.target.value) || 300 })}
                  disabled={!settings.enabled}
                  className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors disabled:opacity-40"
                />
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
