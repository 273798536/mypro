import { cn } from '@/lib/utils';
import type { PointStatus, MergeStatus, AnomalySeverity, AnomalyType, MaterialSource } from '@/types';

export const sourceMeta: Record<MaterialSource, { label: string; emoji: string; cls: string }> = {
  resident_feedback: { label: '居民反馈', emoji: '💬', cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  written: { label: '书面材料', emoji: '📄', cls: 'bg-sky-500/15 text-sky-300 border-sky-500/30' },
  verbal: { label: '口头说明', emoji: '🗣️', cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
};

export const pointStatusMeta: Record<PointStatus, { label: string; dot: string; text: string; ring: string }> = {
  normal: { label: '独立点位', dot: 'bg-accent-normal', text: 'text-accent-normal', ring: 'ring-accent-normal/40' },
  abnormal: { label: '异常', dot: 'bg-accent-abnormal', text: 'text-accent-abnormal', ring: 'ring-accent-abnormal/40' },
  pending: { label: '挂起待确认', dot: 'bg-accent-pending', text: 'text-accent-pending', ring: 'ring-accent-pending/40' },
  merged: { label: '已归并', dot: 'bg-accent-merged', text: 'text-accent-merged', ring: 'ring-accent-merged/40' },
};

export const mergeStatusMeta: Record<MergeStatus, { label: string; cls: string }> = {
  auto_merged: { label: '自动归并', cls: 'bg-accent-merged/15 text-accent-merged border-accent-merged/30' },
  evidence_merged: { label: '持证归并', cls: 'bg-accent-merged/15 text-accent-merged border-accent-merged/30' },
  pending_review: { label: '挂起待确认', cls: 'bg-accent-pending/15 text-accent-pending border-accent-pending/30' },
  split: { label: '已拆分为独立点位', cls: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
};

export const anomalyTypeMeta: Record<AnomalyType, { label: string; icon: string }> = {
  caliber_changed: { label: '材料口径变更', icon: '🔄' },
  adjacent_conflict: { label: '相邻路口冲突', icon: '⚠️' },
  name_inconsistency: { label: '名称不一致', icon: '📝' },
  orphan_point: { label: '孤立点位', icon: '❓' },
};

export const severityMeta: Record<AnomalySeverity, { label: string; cls: string }> = {
  high: { label: '高', cls: 'bg-accent-abnormal/15 text-accent-abnormal border-accent-abnormal/30' },
  medium: { label: '中', cls: 'bg-accent-pending/15 text-accent-pending border-accent-pending/30' },
  low: { label: '低', cls: 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30' },
};

export function SourceBadge({ source }: { source: MaterialSource }) {
  const m = sourceMeta[source];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 text-[11px] rounded-md border whitespace-nowrap', m.cls)}>
      <span>{m.emoji}</span>
      <span>{m.label}</span>
    </span>
  );
}

export function PointStatusDot({ status, size = 'sm' }: { status: PointStatus; size?: 'sm' | 'md' | 'lg' }) {
  const m = pointStatusMeta[status];
  const sz = size === 'lg' ? 'w-3.5 h-3.5' : size === 'md' ? 'w-2.5 h-2.5' : 'w-2 h-2';
  return (
    <span className="relative inline-flex">
      <span className={cn('rounded-full inline-block', sz, m.dot)} />
      {status === 'abnormal' && (
        <span className={cn('absolute inset-0 rounded-full animate-ping opacity-60', m.dot)} />
      )}
      {status === 'pending' && (
        <span className={cn('absolute -inset-1 rounded-full animate-pulse opacity-40', m.dot)} />
      )}
    </span>
  );
}
