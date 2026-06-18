import type { ModelVersion } from '@/types';
import { Layers, CheckCircle, AlertTriangle, ShieldAlert } from 'lucide-react';

interface WorkbenchHeaderProps {
  totalCount: number;
  reviewedCount: number;
  boundaryCount: number;
  leakCount: number;
  modelVersions: ModelVersion[];
}

export function WorkbenchHeader({
  totalCount,
  reviewedCount,
  boundaryCount,
  leakCount,
  modelVersions,
}: WorkbenchHeaderProps) {
  const progress = totalCount > 0 ? (reviewedCount / totalCount) * 100 : 0;

  return (
    <div className="flex-shrink-0 glass-strong border-b border-slate-700/50 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-white">
              复核工作台
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {modelVersions.length} 个模型版本 · 对比分析中
            </p>
          </div>

          <div className="h-8 w-px bg-slate-700" />

          <div className="flex items-center gap-5">
            <StatItem
              icon={Layers}
              label="样本总数"
              value={totalCount}
              color="text-slate-300"
            />
            <StatItem
              icon={CheckCircle}
              label="已复核"
              value={reviewedCount}
              color="text-emerald-400"
            />
            <StatItem
              icon={AlertTriangle}
              label="边界样本"
              value={boundaryCount}
              color="text-amber-warn"
            />
            <StatItem
              icon={ShieldAlert}
              label="泄漏风险"
              value={leakCount}
              color="text-rose-alert"
            />
          </div>
        </div>

        <div className="w-64">
          <div className="flex items-center justify-between text-xs mb-1.5">
            <span className="text-slate-400">复核进度</span>
            <span className="text-slate-300 font-medium">
              {progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-accent to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function StatItem({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Layers;
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <Icon size={16} className={color} />
      <div>
        <div className={`text-sm font-semibold ${color}`}>{value}</div>
        <div className="text-xs text-slate-500">{label}</div>
      </div>
    </div>
  );
}
