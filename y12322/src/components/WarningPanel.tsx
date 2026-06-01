import { AlertTriangle, ArrowLeftRight, Ruler } from 'lucide-react';
import { useActiveMaterial, useActiveResult } from '@/store/useStore';
import type { WarningType } from '@/types';

const warningConfig: Record<WarningType, { icon: typeof AlertTriangle; color: string; bg: string; label: string }> = {
  singularity: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', label: '奇点' },
  reversed_interval: { icon: ArrowLeftRight, color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', label: '区间反向' },
  oversized_step: { icon: Ruler, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', label: '步长过大' },
};

export default function WarningPanel() {
  const activeMaterial = useActiveMaterial();
  const activeResult = useActiveResult();

  if (!activeMaterial) return null;

  const warnings = activeResult?.warnings ?? [];

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">边界提示</h3>

      {warnings.length === 0 && activeResult && (
        <div className="px-3 py-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-xs">
          未检测到边界问题
        </div>
      )}

      {warnings.map((w) => {
        const config = warningConfig[w.type];
        const Icon = config.icon;
        return (
          <div
            key={w.id}
            className={`px-3 py-2.5 rounded-lg border ${config.bg} transition-all`}
          >
            <div className="flex items-start gap-2">
              <Icon size={14} className={`shrink-0 mt-0.5 ${config.color}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                  {w.severity === 'error' && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 font-medium">
                      严重
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-1 ${config.color} opacity-80`}>{w.message}</p>
                {w.position !== undefined && (
                  <p className="text-[10px] mt-1 text-slate-500">位置: x = {w.position.toFixed(6)}</p>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {!activeResult && warnings.length === 0 && (
        <div className="px-3 py-2 rounded-lg border border-slate-700 bg-slate-800/60 text-slate-500 text-xs">
          尚未执行计算
        </div>
      )}
    </div>
  );
}
