import type { AvailabilityStatus, ReviewStatus } from '@/types';
import { cn } from '@/lib/utils';

export function AvailabilityBadge({ status }: { status: AvailabilityStatus }) {
  const config: Record<string, { label: string; cls: string }> = {
    available: {
      label: '可用',
      cls: 'bg-emerald-100 text-emerald-800 border-emerald-300 ring-emerald-200',
    },
    pending: {
      label: '暂缓',
      cls: 'bg-amber-100 text-amber-800 border-amber-300 ring-amber-200',
    },
    recollect: {
      label: '重新采集',
      cls: 'bg-rose-100 text-rose-800 border-rose-300 ring-rose-200',
    },
  };
  const cfg = status ? config[status] : null;
  if (!cfg) {
    return (
      <span className="inline-flex items-center rounded-md border border-slate-300 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-500">
        未标记
      </span>
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        cfg.cls,
      )}
    >
      {cfg.label}
    </span>
  );
}

export function ReviewBadge({ status }: { status: ReviewStatus }) {
  const map: Record<ReviewStatus, { label: string; cls: string }> = {
    none: { label: '未复核', cls: 'bg-slate-100 text-slate-600 border-slate-300' },
    pending: { label: '待复核', cls: 'bg-amber-50 text-amber-700 border-amber-300' },
    approved: { label: '已通过', cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  };
  const cfg = map[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium',
        cfg.cls,
      )}
    >
      {cfg.label}
    </span>
  );
}

export function ActionBadge({ action }: { action: 'fill_material' | 'adjust_caliber' }) {
  const cfg =
    action === 'fill_material'
      ? { label: '补材料', icon: '📎', cls: 'bg-sky-100 text-sky-800 border-sky-300' }
      : { label: '改口径', icon: '⚙️', cls: 'bg-violet-100 text-violet-800 border-violet-300' };
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-semibold',
        cfg.cls,
      )}
    >
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
}
