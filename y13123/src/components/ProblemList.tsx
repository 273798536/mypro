import { useEffect, useRef } from 'react';
import { FileText, AlertTriangle, ChevronRight } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function ProblemList() {
  const problems = useAppStore((s) => s.problems);
  const selected = useAppStore((s) => s.selectedProblemId);
  const selectProblem = useAppStore((s) => s.selectProblem);
  const missing = useAppStore((s) => s.missingUnitProblems);
  const abnormalPoints = useAppStore((s) => s.abnormalPoints);
  const pending = useAppStore((s) => s.pendingConfirmation);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (selected) {
      const el = rowRefs.current[selected];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selected]);

  const getAbnCount = (pid: string) =>
    abnormalPoints.filter((a) => a.problemId === pid).length;

  return (
    <div className="paper-card flex h-full flex-col rounded-xl p-4 animate-fadeSlideLeft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-[15px] text-ink-900">
          <FileText className="h-4 w-4 text-ink-800" />
          题目清单
        </h3>
        <div className="flex items-center gap-1.5">
          <span className="rounded-full bg-ink-900/10 px-2 py-0.5 font-mono-data text-[11px] text-ink-900">
            {problems.length} 条
          </span>
          {pending && missing.length > 0 && (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-ochre-100 px-1.5 py-0.5 text-[10px] text-ochre-700">
              <AlertTriangle className="h-2.5 w-2.5" />
              {missing.length} 条缺失
            </span>
          )}
        </div>
      </div>

      <div className="mb-2 grid grid-cols-[20px_70px_1fr_54px] items-center gap-2 px-2 text-[10.5px] font-medium uppercase tracking-wider text-slateData-500">
        <span />
        <span>编号</span>
        <span>起 → 终</span>
        <span className="text-right">数值</span>
      </div>

      <div className="scroll-thin flex-1 space-y-1.5 overflow-y-auto pr-1">
        {problems.map((p, idx) => {
          const isMissing = missing.includes(p.id);
          const isSelected = selected === p.id;
          const abnCount = getAbnCount(p.id);

          return (
            <div
              key={p.id}
              ref={(el) => {
                rowRefs.current[p.id] = el;
              }}
              onClick={() => selectProblem(p.id)}
              className={cn(
                'group relative grid cursor-pointer grid-cols-[20px_70px_1fr_54px] items-center gap-2 rounded-lg border px-2 py-2 text-[12.5px] transition-all hover:-translate-y-[1px] hover:shadow-card',
                isMissing
                  ? 'stripe-missing border-ochre-300/70 bg-ochre-100/40 hover:bg-ochre-100/70'
                  : 'border-gold-700/20 bg-white hover:bg-paper-50',
                isSelected && [
                  'ring-2 ring-ink-900/30',
                  'animate-flashHighlight',
                  isMissing ? 'bg-ochre-100/60' : 'bg-paper-100',
                ]
              )}
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              {isMissing && (
                <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg bg-ochre-700" />
              )}

              <span className="flex justify-center">
                {isSelected ? (
                  <ChevronRight className="h-3.5 w-3.5 text-ink-900" />
                ) : isMissing ? (
                  <AlertTriangle className="h-3.5 w-3.5 text-ochre-700" />
                ) : (
                  <span
                    className={cn(
                      'h-2 w-2 rounded-full',
                      abnCount > 0 ? 'bg-ochre-700' : 'bg-slateData-300'
                    )}
                  />
                )}
              </span>

              <span className="truncate font-mono-data text-[11px] text-slateData-700">
                {p.id.slice(-6)}
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-display text-ink-900">{p.start}</span>
                  <span className="text-slateData-300">→</span>
                  <span className="font-display text-ink-900">{p.end}</span>
                  {abnCount > 0 && !pending && (
                    <span className="rounded-full bg-ochre-100 px-1.5 py-0 text-[9.5px] text-ochre-700">
                      {abnCount} 异常
                    </span>
                  )}
                </div>
                {p.remark && (
                  <div className="truncate text-[11px] leading-snug text-slateData-500">
                    {p.remark}
                  </div>
                )}
              </div>

              <div className="text-right">
                <div
                  className={cn(
                    'font-mono-data',
                    isMissing ? 'font-semibold text-ochre-700' : 'text-slateData-700'
                  )}
                >
                  {p.distance ?? '—'}
                </div>
                <div
                  className={cn(
                    'text-[10px]',
                    isMissing ? 'text-ochre-700' : 'text-slateData-500'
                  )}
                >
                  {p.unit || '待补'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-2 rounded-md bg-paper-100/60 px-2 py-1.5 text-[10.5px] text-slateData-500">
        提示：点击题目切换最短路径与异常点，双击图表节点可标记异常。
      </div>
    </div>
  );
}
