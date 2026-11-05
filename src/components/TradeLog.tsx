import { TrendingUp, TrendingDown, Clock, Loader2 } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import type { Trade, Stats } from '@/types';

interface TradeLogProps {
  trades: Trade[];
  stats: Stats;
}

export default function TradeLog({ trades, stats }: TradeLogProps) {
  const pieData = [
    { name: 'Wins', value: stats.wins, color: '#22c55e' },
    { name: 'Losses', value: stats.losses, color: '#ef4444' },
  ];

  if (stats.totalTrades === 0) {
    pieData[0].value = 1;
    pieData[1].value = 1;
  }

  return (
    <div className="h-48 bg-[#151a21] border-t border-[#2a2f36] grid grid-cols-[1fr_280px]">
      {/* Trade Log Table */}
      <div className="overflow-hidden flex flex-col">
        <div className="flex items-center gap-2 px-4 py-2 border-b border-[#2a2f36]">
          <Clock className="w-3.5 h-3.5 text-[#475569]" />
          <span className="text-[10px] font-semibold text-[#94a3b8] uppercase tracking-wider">Live Trade Log</span>
          <span className="ml-auto text-[10px] text-[#475569]">{trades.length} trades</span>
        </div>
        <div className="flex-1 overflow-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[#151a21]">
              <tr className="border-b border-[#2a2f36]">
                <th className="text-left px-3 py-1.5 text-[10px] text-[#475569] font-medium">Time</th>
                <th className="text-left px-3 py-1.5 text-[10px] text-[#475569] font-medium">Type</th>
                <th className="text-left px-3 py-1.5 text-[10px] text-[#475569] font-medium">Asset</th>
                <th className="text-right px-3 py-1.5 text-[10px] text-[#475569] font-medium">Stake</th>
                <th className="text-center px-3 py-1.5 text-[10px] text-[#475569] font-medium">Result</th>
                <th className="text-right px-3 py-1.5 text-[10px] text-[#475569] font-medium">Profit</th>
              </tr>
            </thead>
            <tbody>
              {trades.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-[10px] text-[#475569]">
                    Waiting for trades... Start the bot to see live results.
                  </td>
                </tr>
              ) : (
                trades.slice(0, 20).map((trade) => (
                  <tr key={trade.id} className="border-b border-[#2a2f36]/50 hover:bg-[#1c2128]/50 transition-colors">
                    <td className="px-3 py-1.5 text-[10px] text-[#475569] font-mono">{trade.time}</td>
                    <td className="px-3 py-1.5">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                        trade.type === 'CALL' 
                          ? 'bg-[#2563eb]/20 text-[#2563eb]' 
                          : 'bg-[#f59e0b]/20 text-[#f59e0b]'
                      }`}>
                        {trade.type}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 text-[10px] text-[#94a3b8]">{trade.asset}</td>
                    <td className="px-3 py-1.5 text-right text-[10px] text-white font-mono">${trade.stake.toFixed(2)}</td>
                    <td className="px-3 py-1.5 text-center">
                      {trade.result === 'pending' ? (
                        <Loader2 className="w-3.5 h-3.5 text-[#f59e0b] mx-auto animate-spin" />
                      ) : trade.result === 'win' ? (
                        <TrendingUp className="w-3.5 h-3.5 text-[#22c55e] mx-auto" />
                      ) : (
                        <TrendingDown className="w-3.5 h-3.5 text-[#ef4444] mx-auto" />
                      )}
                    </td>
                    <td className={`px-3 py-1.5 text-right text-[10px] font-mono font-semibold ${
                      trade.result === 'pending' ? 'text-[#475569]' : trade.profit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'
                    }`}>
                      {trade.result === 'pending' ? '…' : `${trade.profit >= 0 ? '+' : ''}$${trade.profit.toFixed(2)}`}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mini Stats Panel */}
      <div className="border-l border-[#2a2f36] p-4 flex flex-col justify-center">
        <div className="grid grid-cols-2 gap-4">
          {/* Win Rate Chart */}
          <div className="flex flex-col items-center">
            <span className="text-[10px] text-[#475569] mb-1">Win Rate</span>
            <div className="w-16 h-16">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={20}
                    outerRadius={30}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <span className="text-lg font-mono font-bold text-white -mt-1">
              {stats.totalTrades > 0 ? `${stats.winRate}%` : '—'}
            </span>
          </div>

          {/* Stats Numbers */}
          <div className="space-y-2">
            <div>
              <span className="text-[10px] text-[#475569] block">Total Trades</span>
              <span className="text-lg font-mono font-bold text-white">{stats.totalTrades}</span>
            </div>
            <div>
              <span className="text-[10px] text-[#475569] block">Net P/L</span>
              <span className={`text-lg font-mono font-bold ${stats.netProfit >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                {stats.netProfit >= 0 ? '+' : ''}${stats.netProfit.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Win/Loss Bar */}
        {stats.totalTrades > 0 && (
          <div className="mt-3">
            <div className="flex h-1.5 rounded-full overflow-hidden bg-[#1c2128]">
              <div 
                className="bg-[#22c55e] transition-all duration-500"
                style={{ width: `${stats.winRate}%` }}
              />
              <div 
                className="bg-[#ef4444] transition-all duration-500"
                style={{ width: `${100 - stats.winRate}%` }}
              />
            </div>
            <div className="flex justify-between mt-1">
              <span className="text-[9px] text-[#22c55e]">{stats.wins} wins</span>
              <span className="text-[9px] text-[#ef4444]">{stats.losses} losses</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
