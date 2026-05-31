import type { JudgmentResult, ResultStatus } from '@/types';
import { cn } from '@/lib/utils';

interface SectionTimelineProps {
  results: JudgmentResult[];
  selectedId: string | null;
  onSelect: (result: JudgmentResult) => void;
}

const statusColor: Record<ResultStatus, string> = {
  PASS: 'bg-success',
  WARNING: 'bg-warning',
  FAIL: 'bg-danger',
  MISSING: 'bg-industrial-muted',
};

export default function SectionTimeline({ results, selectedId, onSelect }: SectionTimelineProps) {
  const sortedResults = [...results].sort((a, b) => a.sectionId.localeCompare(b.sectionId));

  return (
    <div className="industrial-card p-4">
      <h3 className="text-sm font-medium text-industrial-muted mb-4">区段时间轴</h3>
      <div className="relative">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-industrial-border/20 -translate-y-1/2" />
        <div className="flex items-center justify-between gap-2 relative">
          {sortedResults.map((result) => (
            <button
              key={result.id}
              onClick={() => onSelect(result)}
              className={cn(
                'group relative flex flex-col items-center transition-all duration-200',
                selectedId === result.id && 'scale-110'
              )}
            >
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border-2 border-industrial-panel',
                  statusColor[result.status],
                  selectedId === result.id && 'ring-4 ring-white/20'
                )}
              >
                <span className="text-white text-xs font-bold">
                  {result.sectionId.split('-')[1]}
                </span>
              </div>
              <div className={cn(
                'absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity',
                'bg-industrial-bg text-xs px-2 py-1 rounded-sm border border-industrial-border/20 z-10'
              )}>
                <p className="font-mono">{result.sectionId}</p>
                <p className="text-industrial-muted">
                  {isNaN(result.gapValue) ? '--' : result.gapValue.toFixed(2)} mm
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
      <div className="flex justify-between mt-8 text-xs text-industrial-muted">
        <span>起点</span>
        <span>终点</span>
      </div>
    </div>
  );
}
