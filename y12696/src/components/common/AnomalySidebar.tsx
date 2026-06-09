import { useSceneStore } from '@/stores/useSceneStore';
import { SeverityBadge } from './StatusBadge';
import { AlertTriangle, AlertCircle, Info, ChevronRight, Check } from 'lucide-react';

const severityIcon = {
  danger: AlertCircle,
  warning: AlertTriangle,
  info: Info,
};

export function AnomalySidebar() {
  const anomalies = useSceneStore((s) => s.anomalies);
  const selectedAnomalyId = useSceneStore((s) => s.selectedAnomalyId);
  const selectAnomaly = useSceneStore((s) => s.selectAnomaly);
  const verifyAnomaly = useSceneStore((s) => s.verifyAnomaly);

  const sorted = [...anomalies].sort((a, b) => {
    const order = { danger: 0, warning: 1, info: 2 };
    return order[a.severity] - order[b.severity];
  });

  return (
    <div className="flex w-72 shrink-0 flex-col border-r border-cyan-500/20 bg-slate-950/95 backdrop-blur-xl">
      <div className="border-b border-slate-800 px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle size={15} className="text-amber-400" />
          <span className="text-xs font-bold text-slate-200">异常结论清单</span>
          <span className="ml-auto rounded-full bg-rose-500/20 px-2 py-0.5 text-[10px] font-bold text-rose-400">
            {anomalies.length}
          </span>
        </div>
        <p className="mt-1 text-[10px] text-slate-500 leading-relaxed">
          点击条目可在三维场景中定位异常位置
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="space-y-1.5">
          {sorted.map((a) => {
            const Icon = severityIcon[a.severity];
            const isSelected = selectedAnomalyId === a.id;
            return (
              <div
                key={a.id}
                onClick={() => selectAnomaly(isSelected ? null : a.id)}
                className={`group cursor-pointer rounded-lg border p-2.5 transition-all ${
                  isSelected
                    ? 'border-cyan-500/50 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                    : 'border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${
                      a.severity === 'danger'
                        ? 'bg-rose-500/15 text-rose-400'
                        : a.severity === 'warning'
                          ? 'bg-amber-500/15 text-amber-400'
                          : 'bg-cyan-500/15 text-cyan-400'
                    }`}
                  >
                    <Icon size={13} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`truncate text-[12px] font-semibold ${
                          isSelected ? 'text-cyan-300' : 'text-slate-200'
                        }`}
                      >
                        {a.title}
                      </span>
                      {a.verified && (
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400">
                          <Check size={10} />
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 flex items-center gap-1.5">
                      <SeverityBadge severity={a.severity} />
                      <span className="text-[10px] text-slate-500">
                        影响 {a.affectedDevices.length} 个设备
                      </span>
                    </div>
                    {isSelected && (
                      <div className="mt-2 rounded-md border border-slate-700/50 bg-slate-950/60 p-2">
                        <div className="text-[10.5px] text-slate-400 leading-relaxed">
                          {a.description}
                        </div>
                        <div className="mt-1.5 text-[10px] text-cyan-400/90 leading-relaxed">
                          💡 {a.explanation.slice(0, 80)}…
                        </div>
                        {!a.verified && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              verifyAnomaly(a.id);
                            }}
                            className="mt-2 w-full rounded-md bg-emerald-500/20 py-1 text-[10px] font-semibold text-emerald-400 transition hover:bg-emerald-500/30"
                          >
                            ✓ 标记已复核
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <ChevronRight
                    size={14}
                    className={`mt-1 shrink-0 transition ${
                      isSelected ? 'text-cyan-400' : 'text-slate-600 group-hover:text-slate-400'
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="border-t border-slate-800 px-4 py-2.5">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-slate-500">已复核</span>
          <span className="font-mono text-emerald-400">
            {anomalies.filter((a) => a.verified).length} / {anomalies.length}
          </span>
        </div>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500 transition-all"
            style={{
              width: `${(anomalies.filter((a) => a.verified).length / anomalies.length) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
}
