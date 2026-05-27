import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { Position, Industry } from '../../types/game.types';
import { formatPercent, formatCurrency } from '../../utils/calculator';
import { Wallet, TrendingUp, TrendingDown, Coins } from 'lucide-react';

interface PortfolioPanelProps {
  positions: Position[];
  industries: Industry[];
  totalAssets: number;
  totalFees: number;
}

const COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#84CC16',
];

const PortfolioPanel: React.FC<PortfolioPanelProps> = ({
  positions,
  industries,
  totalAssets,
  totalFees,
}) => {
  const totalProfit = positions.reduce((sum, p) => sum + p.profit, 0);
  const totalCost = positions.reduce((sum, p) => sum + p.shares * p.costPrice, 0);
  const totalProfitRate = totalCost > 0 ? totalProfit / totalCost : 0;

  const pieData = positions.map((pos, index) => {
    const industry = industries.find(i => i.id === pos.industryId);
    return {
      name: industry?.name || pos.industryId,
      value: pos.weight * 100,
      color: COLORS[index % COLORS.length],
      icon: industry?.icon || '📊',
    };
  });

  const sortedPositions = [...positions].sort((a, b) => b.weight - a.weight);

  return (
    <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Wallet className="w-5 h-5 text-blue-400" />
        <h3 className="font-semibold text-white">持仓组合</h3>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-5">
        <div className="bg-slate-900/50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">总资产</p>
          <p className="text-lg font-bold text-white font-mono">
            {formatCurrency(totalAssets)}
          </p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">总盈亏</p>
          <div className={`flex items-center justify-center gap-1 text-lg font-bold font-mono
            ${totalProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalProfit >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            {totalProfit >= 0 ? '+' : ''}{formatPercent(totalProfitRate)}
          </div>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3 text-center">
          <p className="text-xs text-slate-400 mb-1">累计手续费</p>
          <div className="flex items-center justify-center gap-1 text-lg font-bold text-orange-400 font-mono">
            <Coins size={16} />
            {formatCurrency(totalFees)}
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="w-1/2 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={65}
                paddingAngle={2}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}%`, '权重']}
                contentStyle={{
                  backgroundColor: '#1e293b',
                  border: '1px solid #334155',
                  borderRadius: '8px',
                  color: '#fff',
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="w-1/2 space-y-2 overflow-y-auto max-h-40 pr-2">
          {sortedPositions.slice(0, 5).map((pos, index) => {
            const industry = industries.find(i => i.id === pos.industryId);
            return (
              <div key={pos.industryId} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: COLORS[index % COLORS.length] }}
                />
                <span className="text-sm">{industry?.icon}</span>
                <span className="text-xs text-slate-300 flex-1 truncate">
                  {industry?.name}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {formatPercent(pos.weight)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="space-y-2">
          {sortedPositions.map((pos) => {
            const industry = industries.find(i => i.id === pos.industryId);
            return (
              <div key={pos.industryId} className="flex items-center gap-3">
                <span className="text-lg">{industry?.icon}</span>
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-slate-300">{industry?.name}</span>
                    <span className={`text-xs font-mono ${pos.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pos.profit >= 0 ? '+' : ''}{formatCurrency(pos.profit)}
                    </span>
                  </div>
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{
                        width: `${pos.weight * 100}%`,
                        backgroundColor: COLORS[sortedPositions.indexOf(pos) % COLORS.length],
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PortfolioPanel;
