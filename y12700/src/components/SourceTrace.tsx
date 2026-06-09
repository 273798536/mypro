import { FileText, Image, StickyNote, Hash } from 'lucide-react';
import { useStore } from '@/store';
import AvailabilityBadge from './AvailabilityBadge';

export default function SourceTrace() {
  const matrix = useStore(s => s.currentMatrix);
  const rowAvailability = useStore(s => s.rowAvailability);

  if (!matrix) return null;

  const rows = matrix.cells.map((row, r) => ({
    rowIndex: r,
    sourceRow: row[0]?.sourceRow ?? r + 1,
    sourceImage: row[0]?.sourceImage,
    sourceNote: row[0]?.sourceNote,
    availability: rowAvailability[r]?.availability ?? 'available',
    reason: rowAvailability[r]?.reason ?? '',
  }));

  return (
    <div className="card p-5 animate-fade-up">
      <div className="flex items-center gap-2 mb-3">
        <FileText className="w-4 h-4 text-ink-600" />
        <h3 className="font-serif text-ink-800 font-semibold">来源追溯 · 原始记录</h3>
      </div>
      <div className="divider-gold mb-4" />

      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {rows.map(r => (
          <div
            key={r.rowIndex}
            className="flex items-start gap-3 p-3 rounded-xl bg-ink-50/50 border border-ink-100 hover:bg-ink-50 transition"
          >
            <div className="flex flex-col items-center gap-1 pt-0.5">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-ink-800 text-white text-xs font-mono shadow-card">
                {r.sourceRow}
              </span>
              <span className="text-[10px] text-ink-400 font-mono">行 {r.rowIndex + 1}</span>
            </div>
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <AvailabilityBadge availability={r.availability} size="sm" />
                {r.sourceImage && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-ink-600 bg-white rounded-md px-2 py-0.5 border border-ink-200">
                    <Image className="w-3 h-3" />
                    {r.sourceImage}
                  </span>
                )}
              </div>
              {r.sourceNote && (
                <div className="flex items-start gap-1.5 text-[12px] text-ink-600">
                  <StickyNote className="w-3.5 h-3.5 shrink-0 mt-0.5 text-ink-400" />
                  <span>{r.sourceNote}</span>
                </div>
              )}
              <div className="text-[11.5px] text-ink-500 italic">
                <Hash className="w-3 h-3 inline -mt-0.5 mr-1 opacity-70" />
                {r.reason}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
