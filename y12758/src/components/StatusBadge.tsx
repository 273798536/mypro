import { cn } from '@/lib/utils';

type Status = 'PASS' | 'FAIL' | 'PENDING' | 'UNCERTAIN';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  PASS: {
    label: '通过',
    className: 'bg-pass-light text-pass border border-pass',
  },
  FAIL: {
    label: '超限',
    className: 'bg-fail-light text-fail border border-fail pulse-warn',
  },
  PENDING: {
    label: '待处理',
    className: 'bg-ink-light text-ink-muted',
  },
  UNCERTAIN: {
    label: '存疑',
    className: 'bg-warn-light text-warn',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium', config.className)}>
      {config.label}
    </span>
  );
}
