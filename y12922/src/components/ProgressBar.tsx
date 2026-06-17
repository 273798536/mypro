import { cn } from '@/lib/utils';

export function ProgressBar({
  value,
  max = 1,
  tone = 'teal',
  showValue = false,
  className,
}: {
  value: number;
  max?: number;
  tone?: 'teal' | 'amber' | 'oxblood';
  showValue?: boolean;
  className?: string;
}) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const pct = Math.round(ratio * 100);
  const barClass =
    tone === 'amber'
      ? 'bg-amber2'
      : tone === 'oxblood'
        ? 'bg-oxblood'
        : 'bg-teal';
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-1.5 flex-1 rounded-full bg-ink/10 overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', barClass)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {showValue && (
        <span className="tnum text-xs text-ink-muted w-9 text-right">
          {pct}%
        </span>
      )}
    </div>
  );
}
