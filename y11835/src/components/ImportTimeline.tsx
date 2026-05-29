import type { TimelineEntry } from '@/types/quantum';

const typeIcons: Record<TimelineEntry['type'], string> = {
  IMPORT_STATE: '🃏',
  IMPORT_BASIS: '📐',
  IMPORT_PROBABILITY: '📊',
  SELECT_BASIS: '👆',
  MEASURE: '⚡',
  CONFIRM_WARNING: '✅',
};

export default function ImportTimeline({ timeline }: { timeline: TimelineEntry[] }) {
  return (
    <div className="space-y-1 max-h-60 overflow-y-auto pr-1 scrollbar-thin">
      <div className="text-xs font-medium text-slate-400 mb-2">导入时序</div>
      {timeline.map((entry, i) => (
        <div
          key={i}
          className="flex items-start gap-2 text-xs py-1"
        >
          <span className="shrink-0 w-5 text-center">{typeIcons[entry.type]}</span>
          <span className="text-slate-500">#{entry.stepIndex}</span>
          <span className="text-slate-300 leading-relaxed">{entry.description}</span>
        </div>
      ))}
    </div>
  );
}
