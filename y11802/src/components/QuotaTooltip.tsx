import { X, Check, AlertTriangle } from 'lucide-react';
import type { RedemptionRequest, QuotaConfig } from '@/types';
import { formatAmount } from '@/utils/formatters';

interface QuotaTooltipProps {
  redemption: RedemptionRequest;
  quotaConfig: QuotaConfig;
  onClose: () => void;
}

export default function QuotaTooltip({ redemption, quotaConfig, onClose }: QuotaTooltipProps) {
  const isOverSingleLimit = redemption.requestAmount > quotaConfig.singleRedemptionLimit;
  const deductionAmount = isOverSingleLimit
    ? redemption.requestAmount - quotaConfig.singleRedemptionLimit
    : 0;
  const utilizationPercent = (redemption.requestAmount / quotaConfig.singleRedemptionLimit) * 100;

  return (
    <div className="absolute right-0 top-full mt-2 w-80 z-50">
      <div className="bg-slate-800 border border-slate-600 rounded-lg shadow-xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h5 className="text-sm font-semibold text-white">额度扣减明细</h5>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">单笔赎回限额</span>
            <span className="font-mono text-white">{formatAmount(quotaConfig.singleRedemptionLimit)}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-400">申请赎回金额</span>
            <span className={`font-mono ${isOverSingleLimit ? 'text-amber-400' : 'text-white'}`}>
              {formatAmount(redemption.requestAmount)}
            </span>
          </div>

          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                utilizationPercent > 100 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${Math.min(utilizationPercent, 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">额度使用率 {utilizationPercent.toFixed(1)}%</span>
            {isOverSingleLimit ? (
              <span className="text-amber-400 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                超限
              </span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" />
                正常
              </span>
            )}
          </div>

          {isOverSingleLimit && (
            <div className="mt-2 pt-3 border-t border-slate-700">
              <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-md">
                <p className="text-xs text-amber-300">
                  <strong>扣减金额：</strong>{formatAmount(deductionAmount)} 份
                </p>
                <p className="text-xs text-amber-300 mt-1">
                  <strong>确认金额：</strong>{formatAmount(quotaConfig.singleRedemptionLimit)} 份
                </p>
              </div>
              <p className="text-xs text-slate-500 mt-2">
                来源：额度阈值配置 · 博时信用债券 C
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
