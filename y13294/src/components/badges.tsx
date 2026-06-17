import { cn } from '@/lib/utils';
import { sourceMeta, statusMeta } from '@/lib/ui';
import type { RampStatus, Source } from '@shared/types';

export function StatusChip({
  status,
  className,
}: {
  status: RampStatus;
  className?: string;
}) {
  const m = statusMeta[status];
  return (
    <span
      className={cn(
        'chip whitespace-nowrap',
        m.bg,
        m.text,
        m.border,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', m.dot)} />
      {m.label}
    </span>
  );
}

export function SourceBadge({
  source,
  className,
}: {
  source: Source;
  className?: string;
}) {
  const m = sourceMeta[source];
  return (
    <span
      className={cn(
        'chip whitespace-nowrap font-mono text-[11px]',
        m.bg,
        m.text,
        m.border,
        className,
      )}
    >
      {m.label}
    </span>
  );
}

export function OverrideTag({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <span className="chip border-signal/40 bg-signal/10 text-signal font-mono text-[11px]">
      旧方案覆盖
    </span>
  );
}

export function StatusArrow({
  from,
  to,
}: {
  from: RampStatus | null;
  to: RampStatus;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs">
      <span className={cn('rounded px-1.5 py-0.5', from ? 'bg-line/40 text-muted' : 'text-muted')}>
        {from ? statusMeta[from].label : '初始'}
      </span>
      <span className="text-muted">→</span>
      <StatusChip status={to} />
    </span>
  );
}
