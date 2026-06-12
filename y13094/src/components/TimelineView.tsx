import { AlertTriangle, Circle, CheckCircle, Clock } from 'lucide-react';
import type { TimelineEntry } from '../../shared/types';

interface TimelineViewProps {
  entries: TimelineEntry[];
}

export default function TimelineView({ entries }: TimelineViewProps) {
  return (
    <div className="relative pl-6">
      {entries.map((entry, idx) => {
        const isLast = idx === entries.length - 1;
        return (
          <div key={entry.id} className="relative pb-6 last:pb-0 animate-fade-in" style={{ animationDelay: `${idx * 60}ms` }}>
            {!entry.isGap && !isLast && (
              <div className="absolute left-[-18px] top-6 bottom-0 w-px bg-[var(--color-border)]" />
            )}
            {entry.isGap && !isLast && (
              <div className="absolute left-[-18px] top-6 bottom-0 w-px border-l-2 border-dashed border-[var(--color-warning)]/50" />
            )}

            <div className="absolute left-[-22px] top-1">
              {entry.isGap ? (
                <div className="w-5 h-5 rounded-full bg-[var(--color-warning)]/20 flex items-center justify-center animate-pulse-warning">
                  <AlertTriangle size={12} className="text-[var(--color-warning)]" />
                </div>
              ) : isLast ? (
                <CheckCircle size={18} className="text-[var(--color-success)]" />
              ) : idx === 0 ? (
                <Circle size={18} className="text-[var(--color-accent)] fill-[var(--color-accent)]" />
              ) : (
                <Clock size={18} className="text-[var(--color-text-muted)]" />
              )}
            </div>

            <div className={`rounded-lg p-3 ${entry.isGap ? 'bg-[var(--color-warning)]/10 border border-[var(--color-warning)]/20 border-dashed' : 'bg-[var(--color-bg)]'}`}>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-xs font-mono text-[var(--color-text-muted)]">{entry.timestamp}</span>
                {entry.isGap && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-warning)]/20 text-[var(--color-warning)] font-medium">缺段</span>
                )}
              </div>
              <div className={`text-sm ${entry.isGap ? 'text-[var(--color-warning)] line-through decoration-[var(--color-warning)]/50' : 'text-[var(--color-text)]'}`}>
                {entry.event}
              </div>
              {entry.isGap && entry.gapReason && (
                <div className="text-xs text-[var(--color-warning)]/80 mt-1">原因：{entry.gapReason}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
