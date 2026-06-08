import { Check, AlertTriangle, X } from 'lucide-react';
import clsx from 'clsx';
import type { ReviewStatus } from '@/types';

interface StatusBadgeProps {
  status: ReviewStatus;
  size?: 'sm' | 'md';
}

const STATUS_CONFIG = {
  usable: {
    label: '可直接使用',
    icon: Check,
    bgClass: 'bg-pocket-green/15',
    textClass: 'text-pocket-green',
    borderClass: 'border-pocket-green/30',
    dotClass: 'bg-pocket-green',
  },
  pending: {
    label: '待复核',
    icon: AlertTriangle,
    bgClass: 'bg-pocket-yellow/15',
    textClass: 'text-pocket-yellow',
    borderClass: 'border-pocket-yellow/30',
    dotClass: 'bg-pocket-yellow',
  },
  unusable: {
    label: '不可用',
    icon: X,
    bgClass: 'bg-pocket-red/15',
    textClass: 'text-pocket-red',
    borderClass: 'border-pocket-red/30',
    dotClass: 'bg-pocket-red',
  },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 font-medium',
        config.bgClass,
        config.textClass,
        config.borderClass,
        size === 'sm' ? 'text-[11px]' : 'text-xs',
      )}
    >
      <span className={clsx('rounded-full', config.dotClass, size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
      <Icon size={size === 'sm' ? 11 : 13} />
      {config.label}
    </span>
  );
}
