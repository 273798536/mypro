import { AlertTriangle, ChevronDown, ChevronUp, XCircle, ArrowRight, Layers, Database } from 'lucide-react';
import { useStore } from '@/store/useStore';
import { clsx } from 'clsx';

export function AnomalyAlert() {
  const {
    anomalies,
    expandedAnomalyId,
    setExpandedAnomalyId,
    setSelectedPointId,
    selectNextAnomaly,
    points,
  } = useStore();

  if (anomalies.length === 0) return null;

  const active = anomalies.find((a) => a.id === expandedAnomalyId) ?? anomalies[0];
  const isExpanded = expandedAnomalyId !== null;

  const relatedPoints = active?.pointIds
    .map((id) => points.find((p) => p.id === id))
    .filter(Boolean) ?? [];

  return (
    <div className="absolute top-4 right-4 z-20 w-[360px] max-w-[calc(100%-2rem)]">
      <div
        className={clsx(
          'dc-panel overflow-hidden transition-all duration-300',
          active?.severity === 'error'
            ? 'border-dc-error/40 shadow-[0_0_30px_rgba(255,59,48,0.15)]'
            : 'border-dc-anomaly/40 shadow-[0_0_30px_rgba(255,149,0,0.12)]'
        )}
      >
        <div
          onClick={() => setExpandedAnomalyId(isExpanded ? null : active.id)}
          className="w-full p-3 flex items-start gap-3 text-left cursor-pointer"
        >
          <div
            className={clsx(
              'w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0',
              active?.severity === 'error'
                ? 'bg-dc-error/15 border border-dc-error/40'
                : 'bg-dc-anomaly/15 border border-dc-anomaly/40'
            )}
          >
            <AlertTriangle
              size={16}
              className={active?.severity === 'error' ? 'text-dc-error animate-pulse' : 'text-dc-anomaly'}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={clsx(
                  'dc-tag',
                  active?.type === 'overlap'
                    ? 'text-dc-anomaly border-dc-anomaly/40 bg-dc-anomaly/10'
                    : 'text-dc-error border-dc-error/40 bg-dc-error/10'
                )}
              >
                {active?.type === 'overlap' ? (
                  <>
                    <Layers size={10} />
                    对象重叠
                  </>
                ) : (
                  <>
                    <Database size={10} />
                    坏数据
                  </>
                )}
              </span>
              <span className="text-[10px] font-mono text-dc-text-mute">
                {anomalies.findIndex((a) => a.id === active?.id) + 1}/{anomalies.length}
              </span>
            </div>
            <div className="mt-1 text-xs font-display font-semibold text-dc-text tracking-wide">
              {active?.title}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {relatedPoints.map((p) => (
                <span
                  key={p!.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPointId(p!.id);
                  }}
                  className="dc-tag !py-0 cursor-pointer hover:border-dc-cold hover:text-dc-cold text-dc-text-dim border-dc-border"
                >
                  {p!.name}
                </span>
              ))}
            </div>
          </div>
          <div className="flex items-start gap-1 flex-shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                selectNextAnomaly();
              }}
              className="p-1 hover:text-dc-cold text-dc-text-mute transition-colors"
              title="下一条异常"
            >
              <ArrowRight size={14} />
            </button>
            {isExpanded ? (
              <ChevronUp size={16} className="text-dc-text-mute" />
            ) : (
              <ChevronDown size={16} className="text-dc-text-mute" />
            )}
          </div>
        </div>

        {isExpanded && active && (
          <div className="px-3 pb-3 pt-0 border-t border-dc-border/60">
            <div className="pt-3">
              <div className="text-[10px] font-display font-semibold text-dc-cold tracking-widest uppercase mb-2">
                处理步骤（按顺序执行）
              </div>
              <ol className="space-y-2">
                {active.humanSteps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 w-5 h-5 rounded-sm bg-dc-bg border border-dc-border flex items-center justify-center text-[10px] font-mono font-bold text-dc-cold">
                      {idx + 1}
                    </span>
                    <span className="text-[11px] font-mono text-dc-text leading-relaxed pt-0.5">
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            </div>

            <div className="mt-3 pt-3 border-t border-dc-border/60 flex items-center justify-between">
              <span className="text-[10px] font-mono text-dc-text-mute">
                共 {active.humanSteps.length} 步
              </span>
              <button
                onClick={() => setSelectedPointId(active.pointIds[0] ?? null)}
                className="dc-btn-primary !py-1 !px-2.5 text-[10px]"
              >
                跳转至点位 →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
