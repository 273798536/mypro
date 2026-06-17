import { cn } from '@/lib/utils';
import { statusMeta } from '@/lib/ui';
import type { RampListItem } from '@shared/types';

export function StatCards({ ramps }: { ramps: RampListItem[] }) {
  const total = ramps.length;
  const processed = ramps.filter((r) => r.status === 'processed').length;
  const pending = ramps.filter((r) => r.status === 'pending').length;
  const overridden = ramps.filter((r) => r.status === 'overridden').length;
  const overriding = ramps.filter((r) => r.isOverriding).length;

  const cards = [
    { key: 'total', label: '坡道总数', value: total, sub: '公示清单条目', dot: 'bg-ink' },
    {
      key: 'processed',
      label: statusMeta.processed.label,
      value: processed,
      sub: '材料齐备',
      dot: statusMeta.processed.dot,
      text: statusMeta.processed.text,
    },
    {
      key: 'pending',
      label: statusMeta.pending.label,
      value: pending,
      sub: `含覆盖 ${overriding}`,
      dot: statusMeta.pending.dot,
      text: statusMeta.pending.text,
    },
    {
      key: 'overridden',
      label: statusMeta.overridden.label,
      value: overridden,
      sub: '人工改判挂账',
      dot: statusMeta.overridden.dot,
      text: statusMeta.overridden.text,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.key}
          className="relative overflow-hidden rounded-lg border border-line bg-surface p-4 shadow-card"
        >
          <div className="flex items-center gap-2">
            <span className={cn('h-2 w-2 rounded-full', c.dot)} />
            <span className="font-mono text-[11px] uppercase tracking-wider text-muted">
              {c.label}
            </span>
          </div>
          <div className={cn('mt-2 font-display text-3xl font-semibold', c.text ?? 'text-ink')}>
            {c.value}
          </div>
          <div className="mt-1 text-xs text-muted">{c.sub}</div>
        </div>
      ))}
    </div>
  );
}
