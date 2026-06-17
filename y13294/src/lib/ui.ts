import {
  SOURCE_LABELS,
  STATUS_LABELS,
  type RampStatus,
  type Source,
} from '@shared/types';

export function fmtDateTime(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(
    d.getHours(),
  )}:${p(d.getMinutes())}`;
}

export function relativeDay(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date('2026-06-17T09:00:00+08:00').getTime();
  const diff = Math.round((now - d.getTime()) / 86400000);
  if (diff <= 0) return '今天';
  if (diff === 1) return '昨天';
  if (diff < 30) return `${diff} 天前`;
  return `${Math.round(diff / 30)} 个月前`;
}

export function isToday(iso: string | null): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const ref = new Date('2026-06-17T09:00:00+08:00');
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

export interface StatusMeta {
  label: string;
  dot: string;
  text: string;
  bg: string;
  border: string;
}

export const statusMeta: Record<RampStatus, StatusMeta> = {
  processed: {
    label: STATUS_LABELS.processed,
    dot: 'bg-status-processed',
    text: 'text-status-processed',
    bg: 'bg-status-processed/10',
    border: 'border-status-processed/30',
  },
  pending: {
    label: STATUS_LABELS.pending,
    dot: 'bg-status-pending',
    text: 'text-status-pending',
    bg: 'bg-status-pending/10',
    border: 'border-status-pending/30',
  },
  overridden: {
    label: STATUS_LABELS.overridden,
    dot: 'bg-status-overridden',
    text: 'text-status-overridden',
    bg: 'bg-status-overridden/10',
    border: 'border-status-overridden/30',
  },
};

export interface SourceMeta {
  label: string;
  text: string;
  bg: string;
  border: string;
  alert?: boolean;
}

export const sourceMeta: Record<Source, SourceMeta> = {
  normal: {
    label: SOURCE_LABELS.normal,
    text: 'text-muted',
    bg: 'bg-line/40',
    border: 'border-line',
  },
  old_plan_override: {
    label: SOURCE_LABELS.old_plan_override,
    text: 'text-signal',
    bg: 'bg-signal/10',
    border: 'border-signal/40',
    alert: true,
  },
  resident_feedback: {
    label: SOURCE_LABELS.resident_feedback,
    text: 'text-accent',
    bg: 'bg-accent/10',
    border: 'border-accent/30',
  },
  on_site_photo: {
    label: SOURCE_LABELS.on_site_photo,
    text: 'text-accent',
    bg: 'bg-accent-soft',
    border: 'border-accent/30',
  },
  manual_override: {
    label: SOURCE_LABELS.manual_override,
    text: 'text-status-overridden',
    bg: 'bg-status-overridden/10',
    border: 'border-status-overridden/30',
  },
};

export const STATUS_ORDER: RampStatus[] = ['processed', 'pending', 'overridden'];
export const SOURCE_ORDER: Source[] = [
  'normal',
  'old_plan_override',
  'resident_feedback',
  'on_site_photo',
  'manual_override',
];
