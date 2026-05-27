import React from 'react';
import { Industry, Position } from '../../types/game.types';
import { formatPercent } from '../../utils/calculator';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface IndustryCardProps {
  industry: Industry;
  position?: Position;
  isSelected?: boolean;
  onClick?: () => void;
  showPosition?: boolean;
}

const IndustryCard: React.FC<IndustryCardProps> = ({
  industry,
  position,
  isSelected = false,
  onClick,
  showPosition = true,
}) => {
  const isPositive = industry.dailyChange > 0;
  const isNegative = industry.dailyChange < 0;

  return (
    <div
      onClick={onClick}
      className={`
        relative p-4 rounded-xl border-2 transition-all duration-300 cursor-pointer
        ${isSelected
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/20 scale-105'
          : 'border-slate-700 bg-slate-800/50 hover:border-slate-600 hover:bg-slate-800'
        }
      `}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{industry.icon}</span>
          <div>
            <h3 className="font-semibold text-white text-sm">{industry.name}</h3>
            <p className="text-xs text-slate-400">β: {industry.beta.toFixed(1)}</p>
          </div>
        </div>
        <div
          className={`
            flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium
            ${isPositive ? 'bg-green-500/20 text-green-400' : ''}
            ${isNegative ? 'bg-red-500/20 text-red-400' : ''}
            ${!isPositive && !isNegative ? 'bg-slate-600/50 text-slate-400' : ''}
          `}
        >
          {isPositive && <TrendingUp size={12} />}
          {isNegative && <TrendingDown size={12} />}
          {!isPositive && !isNegative && <Minus size={12} />}
          <span className="font-mono">{formatPercent(industry.dailyChange)}</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">价格</span>
          <span className="text-white font-mono">{industry.currentPrice.toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">PE</span>
          <span className="text-slate-300 font-mono">{industry.basePE.toFixed(1)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-slate-400">PB</span>
          <span className="text-slate-300 font-mono">{industry.basePB.toFixed(2)}</span>
        </div>
      </div>

      {showPosition && position && (
        <div className="mt-3 pt-3 border-t border-slate-700">
          <div className="flex justify-between text-xs mb-2">
            <span className="text-slate-400">持仓权重</span>
            <span className="text-blue-400 font-mono font-medium">
              {formatPercent(position.weight)}
            </span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(position.weight * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs mt-2">
            <span className="text-slate-400">盈亏</span>
            <span className={`font-mono ${position.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {position.profit >= 0 ? '+' : ''}{formatPercent(position.profitRate)}
            </span>
          </div>
        </div>
      )}

      {position && position.weight > 0.3 && (
        <div className="absolute top-2 right-2">
          <span className="px-1.5 py-0.5 bg-orange-500/20 text-orange-400 text-[10px] rounded font-medium">
            ⚠️ 集中
          </span>
        </div>
      )}
    </div>
  );
};

export default IndustryCard;
