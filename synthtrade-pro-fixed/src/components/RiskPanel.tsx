import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, ChevronDown } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { RiskSettings } from '@/types';

interface RiskPanelProps {
  settings: RiskSettings;
  onChange: (settings: RiskSettings) => void;
}

export default function RiskPanel({ settings, onChange }: RiskPanelProps) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="border-b border-[#2a2f36]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1c2128]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4 text-[#22c55e]" />
          <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Risk Management</h2>
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

      {/* Expandable Content */}
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
              className="px-4 pb-4 space-y-3 border-l-2 border-l-[#22c55e]/30 ml-4"
            >
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#475569] mb-1 block">Max Daily Loss ($)</label>
                  <input
                    type="number"
                    value={settings.maxDailyLoss}
                    onChange={(e) => onChange({ ...settings, maxDailyLoss: parseFloat(e.target.value) || 0 })}
                    disabled={!settings.enabled}
                    className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#475569] mb-1 block">Win Target ($)</label>
                  <input
                    type="number"
                    value={settings.dailyWinTarget}
                    onChange={(e) => onChange({ ...settings, dailyWinTarget: parseFloat(e.target.value) || 0 })}
                    disabled={!settings.enabled}
                    className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-40"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#475569] mb-1 block">Max Consecutive Losses</label>
                  <input
                    type="number"
                    value={settings.maxConsecutiveLosses}
                    onChange={(e) => onChange({ ...settings, maxConsecutiveLosses: parseInt(e.target.value) || 0 })}
                    disabled={!settings.enabled}
                    className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-[#475569] mb-1 block">Cooldown (sec)</label>
                  <input
                    type="number"
                    value={settings.cooldownSeconds}
                    onChange={(e) => onChange({ ...settings, cooldownSeconds: parseInt(e.target.value) || 0 })}
                    disabled={!settings.enabled}
                    className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#22c55e] transition-colors disabled:opacity-40"
                  />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
