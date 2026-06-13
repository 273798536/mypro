import { X, AlertTriangle, FileText, Layers, Link } from 'lucide-react';
import { useSpeckleStore } from '@/store/useSpeckleStore';
import { cn } from '@/lib/utils';
import type { AnomalyType, SourceType } from '@/types';

const anomalyConfig: Record<AnomalyType, { label: string; color: string; bg: string }> = {
  extreme: { label: '极端值异常', color: 'text-orange-400', bg: 'bg-orange-500/15 border-orange-500/30' },
  noise: { label: '疑似噪声', color: 'text-amber-400', bg: 'bg-amber-500/15 border-amber-500/30' },
  missing: { label: '数据缺失', color: 'text-rose-400', bg: 'bg-rose-500/15 border-rose-500/30' },
};

const sourceTypeConfig: Record<SourceType, { color: string; icon: typeof FileText }> = {
  铭牌: { color: 'text-cyan-400', icon: FileText },
  材料报告: { color: 'text-emerald-400', icon: Layers },
  操作日志: { color: 'text-violet-400', icon: Link },
};

export function AnomalyDrawer() {
  const selectedAnomaly = useSpeckleStore((s) => s.selectedAnomaly);
  const selectAnomaly = useSpeckleStore((s) => s.selectAnomaly);
  const dataset = useSpeckleStore((s) => s.dataset);

  const isOpen = !!selectedAnomaly;

  if (!dataset) return null;

  return (
    <>
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => selectAnomaly(null)}
      />

      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 w-[460px] max-w-[92vw] bg-slate-900 border-l border-slate-800 shadow-2xl shadow-black/50 z-50 transition-transform duration-500 ease-out flex flex-col',
          isOpen ? 'translate-x-0' : 'translate-x-full'
        )}
      >
        <div className="px-6 py-5 border-b border-slate-800 flex items-start gap-4">
          <div
            className={cn(
              'w-11 h-11 rounded-xl flex items-center justify-center border shrink-0',
              selectedAnomaly && anomalyConfig[selectedAnomaly.type].bg
            )}
          >
            <AlertTriangle
              className={cn('w-5 h-5', selectedAnomaly && anomalyConfig[selectedAnomaly.type].color)}
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-white">异常点追溯</h3>
              {selectedAnomaly && (
                <span
                  className={cn(
                    'text-[11px] font-semibold px-2 py-0.5 rounded-full border',
                    anomalyConfig[selectedAnomaly.type].bg,
                    anomalyConfig[selectedAnomaly.type].color
                  )}
                >
                  {anomalyConfig[selectedAnomaly.type].label}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-1">{dataset.deviceName}</p>
          </div>
          <button
            onClick={() => selectAnomaly(null)}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {selectedAnomaly && (
          <div className="flex-1 overflow-y-auto">
            <div className="px-6 py-5 border-b border-slate-800/60">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-2">
                异常描述
              </h4>
              <p className="text-sm text-slate-200 leading-relaxed">{selectedAnomaly.description}</p>
            </div>

            <div className="px-6 py-5 border-b border-slate-800/60">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                影响范围
              </h4>
              <div className="flex items-center gap-3">
                <div className="flex-1 rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
                  <div className="text-[10px] text-slate-500 mb-1">起始采样点</div>
                  <div className="text-xl font-mono font-semibold text-cyan-400">
                    #{selectedAnomaly.affectedRangeStart}
                  </div>
                </div>
                <div className="w-8 h-0.5 bg-slate-700 rounded-full" />
                <div className="flex-1 rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
                  <div className="text-[10px] text-slate-500 mb-1">结束采样点</div>
                  <div className="text-xl font-mono font-semibold text-cyan-400">
                    #{selectedAnomaly.affectedRangeEnd}
                  </div>
                </div>
                <div className="flex-1 rounded-xl bg-slate-800/50 border border-slate-700/50 p-3">
                  <div className="text-[10px] text-slate-500 mb-1">影响点数</div>
                  <div className="text-xl font-mono font-semibold text-white">
                    {selectedAnomaly.affectedRangeEnd - selectedAnomaly.affectedRangeStart + 1}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-5">
              <h4 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-3">
                来源证据（{selectedAnomaly.evidences.length}）
              </h4>
              <div className="space-y-3">
                {selectedAnomaly.evidences.map((ev) => {
                  const sc = sourceTypeConfig[ev.sourceType];
                  const Icon = sc.icon;
                  return (
                    <div
                      key={ev.id}
                      className="rounded-xl bg-slate-800/40 border border-slate-700/50 overflow-hidden hover:border-slate-600 transition-colors"
                    >
                      <div className="px-4 py-3 border-b border-slate-700/40 flex items-center gap-2">
                        <div className={cn('w-7 h-7 rounded-lg bg-slate-900/60 flex items-center justify-center')}>
                          <Icon className={cn('w-3.5 h-3.5', sc.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-slate-200 truncate">{ev.sourceName}</div>
                          <div className={cn('text-[10px] font-medium', sc.color)}>{ev.sourceType}</div>
                        </div>
                        <div className="text-[10px] font-mono text-slate-500 bg-slate-900/60 px-2 py-1 rounded">
                          第 {ev.lineNumber} 行
                        </div>
                      </div>
                      <div className="px-4 py-3 bg-slate-900/30">
                        <p className="text-xs text-slate-300 leading-relaxed font-mono">
                          <span className="text-slate-500 select-none mr-2">{ev.lineNumber} |</span>
                          {ev.content}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
