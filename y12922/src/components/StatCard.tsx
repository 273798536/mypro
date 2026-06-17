import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function StatCard({
  label,
  value,
  hint,
  tone = 'ink',
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: 'ink' | 'teal' | 'amber' | 'oxblood';
  icon?: ReactNode;
}) {
  const accent =
    tone === 'teal'
      ? 'text-teal'
      : tone === 'amber'
        ? 'text-amber2'
        : tone === 'oxblood'
          ? 'text-oxblood'
          : 'text-ink';
  return (
    <div className="bg-paper-50 border border-ink/10 rounded-sm shadow-ledger px-4 py-3.5 flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-ink-muted">
        <span className="text-xs tracking-wide">{label}</span>
        {icon && <span className={cn('opacity-70', accent)}>{icon}</span>}
      </div>
      <div className={cn('tnum font-display text-3xl leading-none', accent)}>
        {value}
      </div>
      {hint && <span className="text-[11px] text-ink-faint">{hint}</span>}
    </div>
  );
}
