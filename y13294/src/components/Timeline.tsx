import { cn } from '@/lib/utils';
import { fmtDateTime, relativeDay, sourceMeta } from '@/lib/ui';
import { SourceBadge, StatusArrow } from './badges';
import type { ChangeLog } from '@shared/types';

export function Timeline({ logs }: { logs: ChangeLog[] }) {
  if (logs.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-line bg-paper p-6 text-center text-sm text-muted">
        暂无改判记录
      </div>
    );
  }
  return (
    <ol className="relative">
      <span className="absolute bottom-2 left-[7px] top-2 w-px bg-line" />
      {logs.map((log, i) => {
        const m = sourceMeta[log.source];
        return (
          <li
            key={log.id}
            className="relative animate-fade-up pl-8"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span
              className={cn(
                'absolute left-0 top-1.5 h-3.5 w-3.5 rounded-full border-2 border-surface',
                m.alert ? 'bg-signal' : 'bg-accent',
              )}
            />
            <div className="rounded-lg border border-line bg-surface p-3 shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  <SourceBadge source={log.source} />
                  <span className="font-mono text-[11px] text-muted">
                    {log.operator}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-muted" title={fmtDateTime(log.createdAt)}>
                  {fmtDateTime(log.createdAt)} · {relativeDay(log.createdAt)}
                </span>
              </div>

              <div className="mt-2">
                <StatusArrow from={log.previousStatus} to={log.newStatus} />
              </div>

              {log.note && (
                <p className="mt-2 text-sm text-ink/90">{log.note}</p>
              )}
              {log.affectedSummary && (
                <div className="mt-2 flex items-start gap-2 rounded-md border border-accent/20 bg-accent/5 px-2.5 py-1.5">
                  <span className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-accent">
                    影响
                  </span>
                  <span className="text-[13px] leading-snug text-ink/80">
                    {log.affectedSummary}
                  </span>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
