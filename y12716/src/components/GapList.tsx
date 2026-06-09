import { useMemo } from 'react';
import { AlertTriangle, AlertOctagon, ArrowRight } from 'lucide-react';
import type { DataGap } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface GapListProps {
  maxItems?: number;
}

export function GapList({ maxItems }: GapListProps) {
  const { gaps, questions } = useAppStore();

  const displayGaps = useMemo(() => {
    const sorted = [...gaps].sort((a, b) => {
      if (a.severity === b.severity) return 0;
      return a.severity === 'error' ? -1 : 1;
    });
    return maxItems ? sorted.slice(0, maxItems) : sorted;
  }, [gaps, maxItems]);

  const summary = useMemo(() => {
    const warn = gaps.filter((g) => g.severity === 'warning').length;
    const err = gaps.filter((g) => g.severity === 'error').length;
    return { warn, err };
  }, [gaps]);

  const getQuestionName = (id: string) => questions.find((q) => q.id === id)?.name || id;

  return (
    <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] text-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2a4a73] bg-[#173252] px-4 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-[#d4a24c]" />
          <h3 className="font-serif text-lg font-semibold">数据缺口清单</h3>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {summary.err > 0 && (
            <span className="rounded-full bg-[#c85353]/20 px-2 py-0.5 text-[#e99090]">
              {summary.err} 错误
            </span>
          )}
          {summary.warn > 0 && (
            <span className="rounded-full bg-[#d4a24c]/20 px-2 py-0.5 text-[#e0c080]">
              {summary.warn} 警告
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-[#1a2f4d] max-h-[400px] overflow-y-auto">
        {displayGaps.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#7bc9a7]">
            <AlertOctagon className="mx-auto mb-2 h-8 w-8 opacity-50" />
            未检测到数据缺口，所有记录完整
          </div>
        ) : (
          displayGaps.map((g, idx) => <GapItem key={idx} gap={g} questionName={getQuestionName(g.questionId)} />)
        )}
      </div>

      {maxItems && gaps.length > maxItems && (
        <div className="border-t border-[#2a4a73] px-4 py-2 text-center text-xs text-gray-400">
          还有 {gaps.length - maxItems} 条缺口请前往异常报告页查看
        </div>
      )}
    </div>
  );
}

function GapItem({ gap, questionName }: { gap: DataGap; questionName: string }) {
  const isError = gap.severity === 'error';

  return (
    <div className={`px-4 py-3 transition-colors hover:bg-[#1a2f4d]/60`}>
      <div className="flex items-start gap-3">
        <div
          className={`mt-0.5 shrink-0 rounded p-1 ${
            isError ? 'bg-[#c85353]/20 text-[#e99090]' : 'bg-[#d4a24c]/20 text-[#e0c080]'
          }`}
        >
          {isError ? <AlertOctagon className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-[#d4a24c]">{gap.questionId}</span>
            <span className="truncate text-sm text-gray-100">{questionName}</span>
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] ${
                isError ? 'bg-[#c85353]/30 text-[#e99090]' : 'bg-[#d4a24c]/30 text-[#e0c080]'
              }`}
            >
              {isError ? 'ERROR' : 'WARNING'}
            </span>
            <span className="shrink-0 rounded bg-[#1e3a5f] px-1.5 py-0.5 text-[10px] text-gray-400">
              {gap.fieldName}
            </span>
          </div>
          <div className="mt-1 text-xs text-gray-300">{gap.description}</div>
          <div className="mt-1 flex items-center gap-1 text-[11px] text-[#8ab8e0]">
            <ArrowRight className="h-3 w-3" />
            <span>影响：{gap.impact}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
