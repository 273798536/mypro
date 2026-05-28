import { Wallet, TrendingUp, TrendingDown, AlertTriangle, Clock } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { StatusBadge } from '@/components/common/StatusBadge';
import { BalanceProgress } from './BalanceProgress';
import { formatDateTime } from '@/utils/formatters';
import type { ReservePool } from '@/types';

interface ReservePoolCardProps {
  pool: ReservePool;
}

export function ReservePoolCard({ pool }: ReservePoolCardProps) {
  const batches = useAppStore(state => state.batches.filter(b => b.merchantId === pool.merchantId));
  const refundOrders = useAppStore(state => state.refundOrders.filter(r => r.reservePoolId === pool.id));
  
  const hasOverdraft = pool.availableBalance < 0;
  const hasNearThreshold = pool.availableBalance < pool.overdraftThreshold && pool.availableBalance >= 0;

  const activeBatches = batches.filter(b => b.status === 'active');
  const pendingRefunds = refundOrders.filter(r => r.status === 'pending' || r.status === 'frozen');
  const totalPendingAmount = pendingRefunds.reduce((sum, r) => sum + r.amount, 0);

  return (
    <div className={`bg-white border-2 rounded-lg p-5 shadow-sm transition-all ${
      hasOverdraft ? 'border-red-400 bg-red-50/30' :
      hasNearThreshold ? 'border-orange-400 bg-orange-50/30' :
      'border-slate-200'
    }`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
            hasOverdraft ? 'bg-red-100 text-red-600' :
            hasNearThreshold ? 'bg-orange-100 text-orange-600' :
            'bg-amber-100 text-amber-600'
          }`}>
            <Wallet size={24} />
          </div>
          <div>
            <h4 className="font-mono font-bold text-slate-800">
              {pool.originalName}
              <span className="ml-1 text-xs text-amber-600">*</span>
            </h4>
            <p className="text-sm text-slate-500 font-mono">
              {pool.merchantName}
            </p>
          </div>
        </div>
        {hasOverdraft && (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-red-100 text-red-700 border border-red-300 rounded animate-pulse">
            <AlertTriangle size={12} />
            已透支
          </span>
        )}
        {hasNearThreshold && !hasOverdraft && (
          <span className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-orange-100 text-orange-700 border border-orange-300 rounded">
            <Clock size={12} />
            接近阈值
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="text-center">
          <p className="text-xs text-slate-500 font-mono mb-1">总余额</p>
          <AmountDisplay amount={pool.totalBalance} size="md" />
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 font-mono mb-1">冻结金额</p>
          <div className="flex items-center justify-center gap-1">
            <TrendingUp size={14} className="text-orange-500" />
            <AmountDisplay amount={pool.frozenAmount} size="md" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-xs text-slate-500 font-mono mb-1">可用余额</p>
          <div className="flex items-center justify-center gap-1">
            <TrendingDown size={14} className={pool.availableBalance < 0 ? 'text-red-500' : 'text-green-500'} />
            <AmountDisplay amount={pool.availableBalance} size="md" />
          </div>
        </div>
      </div>

      <div className="mb-4">
        <BalanceProgress
          total={pool.totalBalance}
          used={pool.frozenAmount}
          threshold={pool.totalBalance - pool.overdraftThreshold}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4 pt-3 border-t border-slate-100">
        <div>
          <p className="text-xs text-slate-500 font-mono mb-1">活跃批次</p>
          <div className="flex flex-wrap gap-1">
            {activeBatches.length > 0 ? (
              activeBatches.map(batch => (
                <StatusBadge key={batch.id} status={batch.status} size="sm" />
              ))
            ) : (
              <span className="text-sm text-slate-400 font-mono">无</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-xs text-slate-500 font-mono mb-1">待处理退款</p>
          <span className="text-sm font-mono text-slate-700">
            {pendingRefunds.length} 笔，合计 {totalPendingAmount.toFixed(2)} 元
          </span>
        </div>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
        <span className="text-xs text-slate-400 font-mono">
          币种: {pool.currency}
        </span>
        <span className="text-xs text-slate-400 font-mono">
          更新时间: {formatDateTime(pool.lastUpdated)}
        </span>
      </div>
    </div>
  );
}
