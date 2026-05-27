import React from 'react';
import { DollarSign, Package, FileText, TrendingUp, AlertTriangle } from 'lucide-react';
import { useGameStore } from '@/store/useGameStore';
import { cn } from '@/lib/utils';

export const StatusBar: React.FC = () => {
  const { round, maxRounds, cash, inventory, activeOrders, activeContracts } =
    useGameStore();

  const cashWarning = cash < 100000;

  return (
    <div className="bg-slate-900 text-white px-6 py-4 shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">回合</span>
            <span className="text-xl font-bold text-white">
              {round} / {maxRounds}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <DollarSign
              className={cn('w-5 h-5', cashWarning ? 'text-red-400' : 'text-emerald-400')}
            />
            <span className="text-slate-400 text-sm">现金</span>
            <span
              className={cn(
                'text-xl font-bold',
                cashWarning ? 'text-red-400' : 'text-emerald-400'
              )}
            >
              ¥{cash.toLocaleString('zh-CN', { maximumFractionDigits: 0 })}
            </span>
            {cashWarning && <AlertTriangle className="w-4 h-4 text-red-400 animate-pulse" />}
          </div>

          <div className="h-8 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-amber-400" />
            <span className="text-slate-400 text-sm">库存</span>
            <span className="text-xl font-bold text-amber-400">{inventory} 件</span>
          </div>

          <div className="h-8 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            <span className="text-slate-400 text-sm">进行中订单</span>
            <span className="text-xl font-bold text-blue-400">
              {activeOrders.filter(o => o.status === 'accepted').length}
            </span>
          </div>

          <div className="h-8 w-px bg-slate-700" />

          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-purple-400" />
            <span className="text-slate-400 text-sm">有效合约</span>
            <span className="text-xl font-bold text-purple-400">
              {activeContracts.filter(c => c.status === 'active').length}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
