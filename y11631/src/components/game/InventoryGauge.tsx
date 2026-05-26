import React from 'react';
import { AlertTriangle, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';
import { GAME_CONFIG } from '../../engine/config';
import { formatPnL, formatPrice, getPnLColor } from '../../utils/format';

interface InventoryGaugeProps {
  inventory: number;
  avgCost: number;
  currentPrice: number;
  unrealizedPnL: number;
  realizedPnL: number;
  totalFees: number;
  inventoryPenalty: number;
  score: number;
  cash: number;
}

export const InventoryGauge: React.FC<InventoryGaugeProps> = ({
  inventory,
  avgCost,
  currentPrice,
  unrealizedPnL,
  realizedPnL,
  totalFees,
  inventoryPenalty,
  score,
  cash,
}) => {
  const absInventory = Math.abs(inventory);
  const maxDisplay = GAME_CONFIG.INVENTORY_THRESHOLD * 2;
  const displayRatio = Math.min(absInventory / maxDisplay, 1);
  const isOverThreshold = absInventory > GAME_CONFIG.INVENTORY_THRESHOLD;
  const inventoryValue = inventory * currentPrice;

  return (
    <div className="bg-terminal-panel rounded-lg border border-terminal-border overflow-hidden">
      <div className="px-4 py-2 border-b border-terminal-border">
        <h3 className="text-sm font-semibold text-gray-300">库存仪表盘</h3>
      </div>
      
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-400">当前持仓</span>
            <span className={`font-mono text-lg font-bold ${
              inventory > 0 ? 'text-trade-up' : inventory < 0 ? 'text-trade-down' : 'text-white'
            }`}>
              {inventory > 0 ? '+' : ''}{inventory}
            </span>
          </div>
          
          <div className="relative h-6 bg-terminal-bg rounded overflow-hidden">
            {inventory !== 0 && (
              <div
                className={`absolute top-0 h-full transition-all duration-300 ${
                  inventory > 0 
                    ? 'right-1/2 bg-trade-up/60' 
                    : 'left-1/2 bg-trade-down/60'
                }`}
                style={{
                  width: `${displayRatio * 50}%`,
                }}
              />
            )}
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gray-600" />
            <div 
              className="absolute top-0 bottom-0 w-px bg-trade-warn/50"
              style={{ left: `${50 - (GAME_CONFIG.INVENTORY_THRESHOLD / maxDisplay) * 50}%` }}
            />
            <div 
              className="absolute top-0 bottom-0 w-px bg-trade-warn/50"
              style={{ left: `${50 + (GAME_CONFIG.INVENTORY_THRESHOLD / maxDisplay) * 50}%` }}
            />
          </div>
          
          {isOverThreshold && (
            <div className="flex items-center gap-1 text-trade-warn text-xs animate-pulse">
              <AlertTriangle size={12} />
              <span>库存风险过高！惩罚系数已生效</span>
            </div>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-terminal-bg rounded p-2">
            <div className="text-gray-500 mb-1">持仓均价</div>
            <div className="font-mono text-white">{formatPrice(avgCost)}</div>
          </div>
          <div className="bg-terminal-bg rounded p-2">
            <div className="text-gray-500 mb-1">库存价值</div>
            <div className={`font-mono ${inventoryValue >= 0 ? 'text-trade-up' : 'text-trade-down'}`}>
              {formatPnL(inventoryValue)}
            </div>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1">
              <TrendingUp size={12} className="text-trade-up" />
              已实现盈亏
            </span>
            <span className={`font-mono ${getPnLColor(realizedPnL)}`}>
              {formatPnL(realizedPnL)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400 flex items-center gap-1">
              <TrendingDown size={12} className="text-trade-warn" />
              未实现盈亏
            </span>
            <span className={`font-mono ${getPnLColor(unrealizedPnL)}`}>
              {formatPnL(unrealizedPnL)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">手续费</span>
            <span className="font-mono text-trade-down">-{totalFees.toFixed(2)}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">库存惩罚</span>
            <span className="font-mono text-trade-down">-{inventoryPenalty.toFixed(2)}</span>
          </div>
        </div>
        
        <div className="border-t border-terminal-border pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400 flex items-center gap-1">
              <DollarSign size={14} />
              当前得分
            </span>
            <span className={`text-xl font-bold font-mono ${getPnLColor(score)}`}>
              {formatPnL(score)}
            </span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="text-gray-400">可用资金</span>
            <span className="font-mono text-white">{cash.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
