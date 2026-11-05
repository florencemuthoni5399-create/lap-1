import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ChevronDown, DollarSign } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { MartingaleSettings } from '@/types';

interface MartingalePanelProps {
  settings: MartingaleSettings;
  onChange: (settings: MartingaleSettings) => void;
}

export default function MartingalePanel({ settings, onChange }: MartingalePanelProps) {
  const [expanded, setExpanded] = useState(true);

  const levels = Array.from({ length: settings.maxLevels }, (_, i) => 
    Math.round(settings.baseStake * Math.pow(settings.multiplier, i) * 100) / 100
  );

  return (
    <div className="border-b border-[#2a2f36]">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1c2128]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-[#f59e0b]" />
          <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Martingale System</h2>
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
              className="px-4 pb-4 space-y-4 border-l-2 border-l-[#f59e0b]/30 ml-4"
            >
              {/* Stake Sequence Visualizer */}
              <div>
                <label className="text-[10px] text-[#475569] mb-2 block">Stake Sequence</label>
                <div className="flex items-center gap-2">
                  {levels.map((stake, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: idx * 0.08 }}
                        className={`px-3 py-2 rounded-md text-center min-w-[60px] ${
                          idx === 0 
                            ? 'bg-[#2563eb]/20 border border-[#2563eb]/40' 
                            : 'bg-[#f59e0b]/10 border border-[#f59e0b]/30'
                        }`}
                      >
                        <div className="text-[10px] text-[#475569]">L{idx + 1}</div>
                        <div className={`text-sm font-mono font-semibold ${
                          idx === 0 ? 'text-[#2563eb]' : 'text-[#f59e0b]'
                        }`}>
                          ${stake}
                        </div>
                      </motion.div>
                      {idx < levels.length - 1 && (
                        <ArrowRight className="w-3 h-3 text-[#475569]" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Max Levels */}
              <div>
                <label className="text-[10px] text-[#475569] mb-1 block">Max Levels</label>
                <input
                  type="number"
                  value={settings.maxLevels}
                  onChange={(e) => onChange({ ...settings, maxLevels: Math.min(5, Math.max(2, parseInt(e.target.value) || 3)) })}
                  min={2}
                  max={5}
                  disabled={!settings.enabled}
                  className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#f59e0b] transition-colors disabled:opacity-40"
                />
              </div>

              {/* Multiplier */}
              <div>
                <label className="text-[10px] text-[#475569] mb-1 block">Multiplier</label>
                <input
                  type="number"
                  value={settings.multiplier}
                  onChange={(e) => onChange({ ...settings, multiplier: parseFloat(e.target.value) || 2 })}
                  step={0.5}
                  min={1.5}
                  max={3}
                  disabled={!settings.enabled}
                  className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-[#f59e0b] transition-colors disabled:opacity-40"
                />
              </div>

              {/* Total Risk */}
              <div className="bg-[#ef4444]/5 border border-[#ef4444]/20 rounded-md p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#475569]">Total Risk (all levels)</span>
                  <span className="text-sm font-mono font-semibold text-[#ef4444]">
                    ${levels.reduce((a, b) => a + b, 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
