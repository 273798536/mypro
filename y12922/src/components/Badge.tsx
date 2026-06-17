import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type {
  BatchStatus,
  AnomalyType,
  AnomalyStatus,
  OpinionAction,
} from '@shared/types';
import {
  BATCH_STATUS_LABELS,
  ANOMALY_TYPE_LABELS,
  ANOMALY_STATUS_LABELS,
  OPINION_ACTION_LABELS,
} from '@shared/types';

type Tone = 'ink' | 'teal' | 'amber' | 'oxblood';

const TONE_CLASS: Record<Tone, string> = {
  ink: 'bg-paper-200 text-ink-soft border-ink/10',
  teal: 'bg-teal-tint text-teal border-teal/20',
  amber: 'bg-amber2-tint text-amber2 border-amber2/25',
  oxblood: 'bg-oxblood-tint text-oxblood border-oxblood/25',
};

export function Badge({
  tone = 'ink',
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[11px] font-medium leading-none tracking-wide',
        TONE_CLASS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function BatchStatusBadge({ status }: { status: BatchStatus }) {
  const tone: Tone =
    status === 'IMPORTED'
      ? 'ink'
      : status === 'REVIEWING'
        ? 'amber'
        : status === 'REVIEWED'
          ? 'teal'
          : 'teal';
  return <Badge tone={tone}>{BATCH_STATUS_LABELS[status]}</Badge>;
}

export function AnomalyTypeBadge({ type }: { type: AnomalyType }) {
  return <Badge tone="amber">{ANOMALY_TYPE_LABELS[type]}</Badge>;
}

export function AnomalyStatusBadge({ status }: { status: AnomalyStatus }) {
  const tone: Tone =
    status === 'OPEN' ? 'amber' : status === 'RESOLVED' ? 'teal' : 'ink';
  return <Badge tone={tone}>{ANOMALY_STATUS_LABELS[status]}</Badge>;
}

export function SeverityBadge({
  severity,
}: {
  severity: 'low' | 'medium' | 'high';
}) {
  const tone: Tone =
    severity === 'high' ? 'oxblood' : severity === 'medium' ? 'amber' : 'ink';
  const label =
    severity === 'high' ? '严重' : severity === 'medium' ? '中等' : '轻微';
  return <Badge tone={tone}>{label}</Badge>;
}

export function OpinionActionBadge({ action }: { action: OpinionAction }) {
  const tone: Tone =
    action === 'KEEP'
      ? 'teal'
      : action === 'REMOVE'
        ? 'oxblood'
        : 'amber';
  return <Badge tone={tone}>{OPINION_ACTION_LABELS[action]}</Badge>;
}
