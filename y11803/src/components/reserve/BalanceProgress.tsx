interface BalanceProgressProps {
  total: number;
  used: number;
  threshold: number;
}

export function BalanceProgress({ total, used, threshold }: BalanceProgressProps) {
  const usagePercent = total > 0 ? (used / total) * 100 : 0;
  const thresholdPercent = total > 0 ? (threshold / total) * 100 : 100;
  
  const isOverThreshold = used > threshold;
  const isNearThreshold = usagePercent > thresholdPercent * 0.8;
  
  const barColor = isOverThreshold
    ? 'bg-red-500'
    : isNearThreshold
    ? 'bg-orange-500'
    : 'bg-green-500';

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-mono text-slate-500">已冻结</span>
        <span className="text-xs font-mono text-slate-500">
          {usagePercent.toFixed(1)}%
        </span>
      </div>
      <div className="relative h-4 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`absolute inset-y-0 left-0 ${barColor} transition-all duration-500`}
          style={{ width: `${Math.min(usagePercent, 100)}%` }}
        />
        <div
          className="absolute inset-y-0 w-0.5 bg-red-600"
          style={{ left: `${thresholdPercent}%` }}
          title={`透支阈值: ¥${threshold.toFixed(2)}`}
        />
      </div>
      <div className="flex items-center justify-between mt-1">
        <span className="text-xs font-mono text-slate-400">
          ¥0
        </span>
        <span className="text-xs font-mono text-red-500">
          阈值 ¥{threshold.toFixed(2)}
        </span>
        <span className="text-xs font-mono text-slate-400">
          ¥{total.toFixed(2)}
        </span>
      </div>
    </div>
  );
}
