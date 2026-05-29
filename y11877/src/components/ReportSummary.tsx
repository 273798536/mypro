import type { GradingResult } from '@/utils/types';
import { CheckCircle, XCircle, Clock } from 'lucide-react';

interface Props {
  results: GradingResult[];
}

export default function ReportSummary({ results }: Props) {
  const passCount = results.filter((r) => r.verdict === 'pass').length;
  const errorCount = results.filter((r) => r.verdict === 'error').length;
  const pendingCount = results.filter((r) => r.verdict === 'pending').length;
  const total = results.length;

  const conflictDistribution: Record<string, number> = {};
  results.forEach((r) => {
    r.conflictSources.forEach((c) => {
      conflictDistribution[c] = (conflictDistribution[c] || 0) + 1;
    });
  });

  const conflictLabels: Record<string, string> = {
    intersection_mismatch: '交点计算冲突',
    reflection_angle_deviation: '反射角偏差',
    boundary_exceeded: '边界越出',
    angle_unit_conflict: '角度单位冲突',
    parallel_no_intersection: '平行无交',
    extension_line_intersection: '延长线交点',
  };

  const passPct = total > 0 ? (passCount / total) * 100 : 0;
  const errorPct = total > 0 ? (errorCount / total) * 100 : 0;
  const pendingPct = total > 0 ? (pendingCount / total) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <span className="text-sm text-emerald-300 font-medium">通过</span>
          </div>
          <div className="text-3xl font-bold text-emerald-400 font-mono">{passCount}</div>
          <div className="text-xs text-emerald-400/60 mt-1">{passPct.toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <XCircle className="w-5 h-5 text-red-400" />
            <span className="text-sm text-red-300 font-medium">错误</span>
          </div>
          <div className="text-3xl font-bold text-red-400 font-mono">{errorCount}</div>
          <div className="text-xs text-red-400/60 mt-1">{errorPct.toFixed(1)}%</div>
        </div>
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <span className="text-sm text-amber-300 font-medium">待确认</span>
          </div>
          <div className="text-3xl font-bold text-amber-400 font-mono">{pendingCount}</div>
          <div className="text-xs text-amber-400/60 mt-1">{pendingPct.toFixed(1)}%</div>
        </div>
      </div>

      <div className="rounded-xl border border-[#2d2d44] bg-[#13132a] p-5">
        <h3 className="text-sm font-semibold text-gray-300 mb-4">冲突类型分布</h3>
        {Object.keys(conflictDistribution).length === 0 ? (
          <div className="text-gray-500 text-sm">无冲突记录</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(conflictDistribution)
              .sort((a, b) => b[1] - a[1])
              .map(([key, count]) => {
                const pct = total > 0 ? (count / total) * 100 : 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-gray-400 w-24 flex-shrink-0">
                      {conflictLabels[key] || key}
                    </span>
                    <div className="flex-1 h-3 bg-[#2d2d44] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#f0c040] rounded-full transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-xs font-mono text-gray-400 w-12 text-right">
                      {count} ({pct.toFixed(0)}%)
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}
