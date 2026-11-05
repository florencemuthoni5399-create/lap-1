import { Settings, TrendingUp } from 'lucide-react';
import type { StrategySettings } from '@/types';

interface StrategyPanelProps {
  settings: StrategySettings;
  onChange: (settings: StrategySettings) => void;
}

export default function StrategyPanel({ settings, onChange }: StrategyPanelProps) {
  return (
    <div className="p-4 border-b border-[#2a2f36]">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-4 h-4 text-[#2563eb]" />
        <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Parameters</h2>
      </div>

      <div className="space-y-3">
        {/* Strategy */}
        <div>
          <label className="text-xs text-[#475569] mb-1 block">Strategy</label>
          <select
            value={settings.strategy}
            onChange={(e) => onChange({ ...settings, strategy: e.target.value })}
            className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563eb] transition-colors appearance-none"
          >
            <option>Smart Barrier</option>
            <option>Trend Following</option>
            <option>Mean Reversion</option>
            <option>Breakout</option>
          </select>
        </div>

        {/* Asset + Type */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-[#475569] mb-1 block">Asset</label>
            <select
              value={settings.asset}
              onChange={(e) => onChange({ ...settings, asset: e.target.value })}
              className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563eb] transition-colors appearance-none"
            >
              <option>R_75</option>
              <option>R_100</option>
              <option>R_50</option>
              <option>Volatility 75</option>
              <option>Volatility 100</option>
            </select>
          </div>
          <div>
            <label className="text-xs text-[#475569] mb-1 block">Type</label>
            <select
              value={settings.type}
              onChange={(e) => onChange({ ...settings, type: e.target.value })}
              className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#2563eb] transition-colors appearance-none"
            >
              <option>RESET CALL</option>
              <option>CALL</option>
              <option>PUT</option>
              <option>Rise/Fall</option>
            </select>
          </div>
        </div>

        {/* Stake */}
        <div>
          <label className="text-xs text-[#475569] mb-1 block">Stake ($)</label>
          <div className="relative">
            <TrendingUp className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#475569]" />
            <input
              type="number"
              value={settings.stake}
              onChange={(e) => onChange({ ...settings, stake: parseFloat(e.target.value) || 0 })}
              min={1}
              step={1}
              className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md pl-9 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
