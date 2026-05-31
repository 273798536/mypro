import type { ResultStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: ResultStatus;
  className?: string;
}

const statusConfig: Record<ResultStatus, { label: string; className: string }> = {
  PASS: { label: '通过', className: 'status-pass' },
  WARNING: { label: '警告', className: 'status-warning' },
  FAIL: { label: '失败', className: 'status-fail' },
  MISSING: { label: '缺失', className: 'status-missing' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  return (
    <span className={cn(config.className, className)}>
      {config.label}
    </span>
  );
}
