import type { QueueResult } from '@/types';
import { AlertTriangle, Clock, Users, TrendingUp } from 'lucide-react';

interface Props {
  result: QueueResult | null;
  queueThreshold: number;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  unit,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  unit?: string;
  highlight?: boolean;
}) {
  return (
    <div className={`rounded-lg p-4 border ${highlight ? 'border-amber-500/50 bg-amber-900/20' : 'border-slate-700 bg-slate-800/50'}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`w-4 h-4 ${highlight ? 'text-amber-400' : 'text-slate-400'}`} />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${highlight ? 'text-amber-400' : 'text-slate-100'}`}>{value}</span>
        {unit && <span className="text-xs text-slate-500">{unit}</span>}
      </div>
    </div>
  );
}

export default function ResultPanel({ result, queueThreshold }: Props) {
  if (!result) {
    return (
      <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-8 flex items-center justify-center">
        <div className="text-center text-slate-400">
          <Clock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">请输入参数并点击"执行试算"</p>
        </div>
      </div>
    );
  }

  const exceedsThreshold = result.Lq > queueThreshold;
  const isStable = result.rho < 0.8;

  return (
    <div className="bg-slate-900/80 rounded-xl border border-slate-700 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-amber-400">计算结果</h2>
        <div className="flex items-center gap-2">
          {exceedsThreshold && (
            <span className="px-2 py-1 text-xs bg-red-900/40 text-red-400 rounded border border-red-700/50">
              <AlertTriangle className="w-3 h-3 inline mr-1" />
              队列超阈值
            </span>
          )}
          {!isStable && !exceedsThreshold && (
            <span className="px-2 py-1 text-xs bg-amber-900/40 text-amber-400 rounded border border-amber-700/50">
              <TrendingUp className="w-3 h-3 inline mr-1" />
              服务强度偏高
            </span>
          )}
          {isStable && !exceedsThreshold && (
            <span className="px-2 py-1 text-xs bg-emerald-900/40 text-emerald-400 rounded border border-emerald-700/50">
              运行稳定
            </span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricCard
          icon={Clock}
          label="平均等待时间 Wq"
          value={result.Wq.toFixed(2)}
          unit="分钟"
          highlight={result.Wq > 5}
        />
        <MetricCard
          icon={Users}
          label="平均队列长度 Lq"
          value={result.Lq.toFixed(2)}
          unit="人"
          highlight={exceedsThreshold}
        />
        <MetricCard
          icon={TrendingUp}
          label="服务强度 ρ"
          value={result.rho.toFixed(4)}
          highlight={result.rho >= 0.8}
        />
        <MetricCard
          icon={AlertTriangle}
          label="等待概率 Pw"
          value={(result.Pw * 100).toFixed(1)}
          unit="%"
          highlight={result.Pw > 0.5}
        />
        <MetricCard
          icon={Clock}
          label="系统逗留时间 W"
          value={result.W.toFixed(2)}
          unit="分钟"
        />
        <MetricCard
          icon={Users}
          label="系统顾客数 L"
          value={result.L.toFixed(2)}
          unit="人"
        />
        <MetricCard
          icon={TrendingUp}
          label="系统空闲概率 P0"
          value={(result.P0 * 100).toFixed(1)}
          unit="%"
        />
        <MetricCard
          icon={TrendingUp}
          label="柜台利用率"
          value={(result.utilization * 100).toFixed(1)}
          unit="%"
        />
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700">
        <div className="text-xs text-slate-400 mb-2">服务强度分布</div>
        <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all ${
              result.rho >= 1 ? 'bg-red-500' : result.rho >= 0.8 ? 'bg-amber-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${Math.min(result.rho * 100, 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>0</span>
          <span>0.5</span>
          <span>0.8</span>
          <span>1.0+</span>
        </div>
      </div>
    </div>
  );
}
