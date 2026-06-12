import { useEffect, useRef } from 'react';
import { FileText } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { cn } from '@/lib/utils';

export default function ProblemList() {
  const problems = useAppStore((s) => s.problems);
  const selected = useAppStore((s) => s.selectedProblemId);
  const selectProblem = useAppStore((s) => s.selectProblem);
  const missing = useAppStore((s) => s.missingUnitProblems);
  const flashId = useRef<string | null>(null);
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (selected && selected !== flashId.current) {
      flashId.current = selected;
      const el = rowRefs.current[selected];
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [selected]);

  return (
    <div className="paper-card flex h-full flex-col rounded-xl p-4 animate-fadeSlideLeft">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 font-display text-[15px] text-ink-900">
          <FileText className="h-4 w-4 text-ink-800" />
          题目清单
        </h3>
        <span className="rounded-full bg-ink-900/10 px-2 py-0.5 font-mono-data text-[11px] text-ink-900">
          {problems.length} 条
        </span>
      </div>
      <div className="mb-2 grid grid-cols-[auto_78px_1fr_60px_54px] gap-2 px-2 text-[11px] font-medium uppercase tracking-wider text-slateData-500">
        <span />
        <span>编号</span>
        <span>起 → 终</span>
        <span>距离</span>
        <span>单位</span>
      </div>
      <div className="scroll-thin flex-1 space-y-1.5 overflow-y-auto pr-1">
        {problems.map((p) => {
          const isMissing = missing.includes(p.id);
          const isSelected = selected === p.id;
          return (
            <div
              key={p.id}
              ref={(el) => {
                rowRefs.current[p.id] = el;
              }}
              onClick={() => selectProblem(p.id)}
              className={cn(
                'group relative grid cursor-pointer grid-cols-[auto_78px_1fr_60px_54px] items-center gap-2 rounded-lg border px-2 py-2 text-[12.5px] transition-all hover:-translate-y-[1px] hover:shadow-card',
                isMissing
                  ? 'stripe-missing border-ochre-300/70 bg-ochre-100/40 hover:bg-ochre-100/70'
                  : 'border-gold-700/20 bg-white hover:bg-paper-50',
                isSelected && [
                  'ring-2 ring-ink-900/30',
                  isMissing ? 'animate-flashHighlight' : 'animate-flashHighlight',
                ]
              )}
            >
              {isMissing && (
                <span className="absolute left-0 top-0 h-full w-[3px] rounded-l-lg bg-ochre-700" />
              )}
              <span className="flex h-2 w-2 justify-self-center">
                <span
                  className={cn(
                    'h-2 w-2 rounded-full',
                    isMissing ? 'bg-ochre-700' : 'bg-ink-700'
                  )}
                />
              </span>
              <span className="truncate font-mono-data text-[11px] text-slateData-700">
                {p.id.slice(-6)}
              </span>
              <span className="truncate">
                <span className="font-display text-ink-900">{p.start}</span>
                <span className="mx-1 text-slateData-300">→</span>
                <span className="font-display text-ink-900">{p.end}</span>
              </span>
              <span className="font-mono-data text-slateData-700">
                {p.distance ?? '—'}
              </span>
              <span
                className={cn(
                  'font-mono-data',
                  isMissing ? 'font-semibold text-ochre-700' : 'text-slateData-500'
                )}
              >
                {p.unit || '待补'}
              </span>
              {p.remark && (
                <div className="col-span-5 -mt-0.5 text-[11px] leading-snug text-slateData-500">
                  {p.remark}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
