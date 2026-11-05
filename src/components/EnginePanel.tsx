import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Layers, CheckCircle2, XCircle, MinusCircle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import type { EngineSettings, Decision, StakingMode } from '@/types';

interface EnginePanelProps {
  settings: EngineSettings;
  onChange: (settings: EngineSettings) => void;
  decision: Decision | null;
  livePayout: number | null;
  isRealMode: boolean;
}

function Num({
  label, value, onChange, step = 1, min, max, hint,
}: {
  label: string; value: number; onChange: (v: number) => void; step?: number; min?: number; max?: number; hint?: string;
}) {
  return (
    <div>
      <label className="text-[10px] text-[#475569] mb-1 block">{label}</label>
      <input
        type="number"
        value={Number.isFinite(value) ? value : ''}
        step={step}
        min={min}
        max={max}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          if (Number.isFinite(v)) onChange(Math.min(max ?? Infinity, Math.max(min ?? -Infinity, v)));
        }}
        className="w-full bg-[#1c2128] border border-[#2a2f36] rounded-md px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-[#2563eb] transition-colors"
      />
      {hint && <span className="text-[9px] text-[#475569] mt-0.5 block">{hint}</span>}
    </div>
  );
}

const MODES: { id: StakingMode; label: string }[] = [
  { id: 'kelly', label: 'Fractional Kelly' },
  { id: 'fixed', label: 'Fixed' },
  { id: 'martingale', label: 'Martingale' },
];

export default function EnginePanel({ settings, onChange, decision, livePayout, isRealMode }: EnginePanelProps) {
  const [expanded, setExpanded] = useState(true);
  const set = <K extends keyof EngineSettings>(k: K, v: EngineSettings[K]) => onChange({ ...settings, [k]: v });
  const m = decision?.metrics;
  const fmt = (x: number | null | undefined, d = 1) => (x == null ? '-' : `${(x * 100).toFixed(d)}%`);

  return (
    <div className="border-b border-[#2a2f36]">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#1c2128]/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-[#22c55e]" />
          <h2 className="text-xs font-semibold text-[#94a3b8] uppercase tracking-wider">Decision Pipeline</h2>
        </div>
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Switch checked={settings.enabled} onCheckedChange={(c) => set('enabled', c)} />
          <ChevronDown
            onClick={() => setExpanded(!expanded)}
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
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4 border-l-2 border-l-[#22c55e]/30 ml-4">
              {/* Live verdict */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[10px] text-[#475569]">Latest decision</label>
                  {decision && (
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      decision.action === 'trade' ? 'bg-[#22c55e]/20 text-[#22c55e]' : 'bg-[#475569]/30 text-[#94a3b8]'
                    }`}>
                      {decision.action === 'trade' ? `${decision.direction} $${decision.stake.toFixed(2)}` : 'SKIP'}
                    </span>
                  )}
                </div>
                {!decision ? (
                  <p className="text-[10px] text-[#475569]">Start the bot to see each layer's verdict.</p>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] text-[#94a3b8] mb-1">{decision.reason}</p>
                    {decision.layers.map((l) => (
                      <div key={l.id} className="flex gap-1.5 items-start bg-[#1c2128] rounded px-2 py-1">
                        {l.skipped ? (
                          <MinusCircle className="w-3 h-3 mt-0.5 text-[#475569] shrink-0" />
                        ) : l.pass ? (
                          <CheckCircle2 className="w-3 h-3 mt-0.5 text-[#22c55e] shrink-0" />
                        ) : (
                          <XCircle className="w-3 h-3 mt-0.5 text-[#ef4444] shrink-0" />
                        )}
                        <div className="min-w-0">
                          <div className="text-[10px] text-white font-medium">{l.name}</div>
                          <div className="text-[9px] text-[#475569] break-words">{l.detail}</div>
                        </div>
                      </div>
                    ))}
                    {m && m.pHat != null && (
                      <div className="grid grid-cols-3 gap-1 pt-1">
                        {[
                          ['Hit-rate', fmt(m.pHat)],
                          ['Edge (low)', fmt(m.pLower)],
                          ['Break-even', fmt(m.breakeven)],
                        ].map(([k, v]) => (
                          <div key={k} className="bg-[#1c2128] rounded px-2 py-1 text-center">
                            <div className="text-[9px] text-[#475569]">{k}</div>
                            <div className="text-[11px] font-mono text-white">{v}</div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Staking */}
              <div>
                <label className="text-[10px] text-[#475569] mb-1.5 block">Layer 3 - Staking</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {MODES.map((mo) => (
                    <button
                      key={mo.id}
                      onClick={() => set('stakingMode', mo.id)}
                      className={`text-[10px] py-1.5 rounded-md border transition-colors ${
                        settings.stakingMode === mo.id
                          ? 'bg-[#22c55e]/15 border-[#22c55e]/50 text-[#22c55e]'
                          : 'bg-[#1c2128] border-[#2a2f36] text-[#94a3b8] hover:bg-[#2a2f36]'
                      }`}
                    >
                      {mo.label}
                    </button>
                  ))}
                </div>
                {settings.stakingMode === 'martingale' && (
                  <p className="text-[9px] text-[#f59e0b] mt-1">
                    Martingale raises stakes after losses; it has no statistical edge and can lose a whole bankroll quickly.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Num label="Kelly fraction" value={settings.kellyFraction} onChange={(v) => set('kellyFraction', v)} step={0.05} min={0.05} max={1} hint="0.25 = quarter Kelly" />
                <Num label="Max stake % of balance" value={settings.maxStakePct} onChange={(v) => set('maxStakePct', v)} step={0.5} min={0.1} max={25} />
                <Num label="Edge confidence (z)" value={settings.kellyZ} onChange={(v) => set('kellyZ', v)} step={0.1} min={0} max={3} hint="1.64 = 95% one-sided" />
                <Num label="Min stake" value={settings.minStake} onChange={(v) => set('minStake', v)} step={0.05} min={0.01} />
              </div>

              <div className="border-t border-[#2a2f36] pt-3">
                <label className="text-[10px] text-[#475569] mb-2 block">Layer 1 - Value filter</label>
                <div className="grid grid-cols-2 gap-3">
                  <Num
                    label={isRealMode && livePayout ? 'Payout ratio (live from Deriv)' : 'Payout ratio'}
                    value={isRealMode && livePayout ? Math.round(livePayout * 1000) / 1000 : settings.payoutRatio}
                    onChange={(v) => set('payoutRatio', v)} step={0.01} min={0.5} max={5}
                    hint={isRealMode && livePayout ? 'Live value overrides this' : 'Net profit per $1'}
                  />
                  <Num label="Min EV per $1" value={settings.minEv} onChange={(v) => set('minEv', v)} step={0.005} min={0} max={0.5} />
                </div>
              </div>

              <div className="border-t border-[#2a2f36] pt-3">
                <label className="text-[10px] text-[#475569] mb-2 block">Layer 2 - False-signal filter</label>
                <div className="grid grid-cols-2 gap-3">
                  <Num label="Contract ticks" value={settings.horizonTicks} onChange={(v) => set('horizonTicks', Math.round(v))} min={1} max={10} />
                  <Num label="Min past signals" value={settings.minSamples} onChange={(v) => set('minSamples', Math.round(v))} min={5} max={200} />
                  <Num label="Max false-rate" value={settings.maxFalseRate} onChange={(v) => set('maxFalseRate', v)} step={0.01} min={0.1} max={0.6} />
                  <Num label="Signal must hold (ticks)" value={settings.persistTicks} onChange={(v) => set('persistTicks', Math.round(v))} min={1} max={10} />
                </div>
              </div>

              <div className="border-t border-[#2a2f36] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] text-[#475569]">Layer 4 - Volatility / regime gate</label>
                  <Switch checked={settings.regimeEnabled} onCheckedChange={(c) => set('regimeEnabled', c)} />
                </div>
                <div className={`grid grid-cols-3 gap-3 ${settings.regimeEnabled ? '' : 'opacity-40 pointer-events-none'}`}>
                  <Num label="Vol ratio min" value={settings.volRatioMin} onChange={(v) => set('volRatioMin', v)} step={0.1} min={0.1} max={2} />
                  <Num label="Vol ratio max" value={settings.volRatioMax} onChange={(v) => set('volRatioMax', v)} step={0.1} min={1} max={5} />
                  <Num label="Min efficiency" value={settings.minEfficiency} onChange={(v) => set('minEfficiency', v)} step={0.02} min={0} max={1} />
                </div>
              </div>

              <p className="text-[9px] text-[#475569] leading-relaxed">
                Order: signal, L4 regime, L2 false-signal, L1 value, then L3 sizing. Kelly only sizes a trade the
                earlier layers already accepted, and stakes 0 when no edge is statistically demonstrated.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
