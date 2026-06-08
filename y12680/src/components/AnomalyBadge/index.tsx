import { CameraOff, GitMerge, FileX } from 'lucide-react';
import clsx from 'clsx';
import type { AnomalyType } from '@/types';
import { getAnomalyLabel } from '@/utils/anomalyDetector';

interface AnomalyBadgeProps {
  type?: AnomalyType;
}

const ANOMALY_CONFIG: Record<AnomalyType, { icon: typeof CameraOff; bg: string; text: string; border: string }> = {
  camera_lost: {
    icon: CameraOff,
    bg: 'bg-orange-500/15',
    text: 'text-orange-400',
    border: 'border-orange-500/30',
  },
  data_conflict: {
    icon: GitMerge,
    bg: 'bg-rose-500/15',
    text: 'text-rose-400',
    border: 'border-rose-500/30',
  },
  format_error: {
    icon: FileX,
    bg: 'bg-red-500/15',
    text: 'text-red-400',
    border: 'border-red-500/30',
  },
};

export function AnomalyBadge({ type }: AnomalyBadgeProps) {
  if (!type) {
    return (
      <span className="text-[11px] text-pocket-muted">
        无异常
      </span>
    );
  }

  const config = ANOMALY_CONFIG[type];
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[11px] font-medium',
        config.bg,
        config.text,
        config.border,
      )}
    >
      <Icon size={11} />
      {getAnomalyLabel(type)}
    </span>
  );
}
