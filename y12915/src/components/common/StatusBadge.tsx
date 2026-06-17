import { cn } from '@/lib/utils';

type ReviewStatus = 'direct_use' | 'need_review' | 'rejected' | 'pending';
type SafetyStatus = 'pass' | 'fail' | 'pending';

interface StatusBadgeProps {
  status: ReviewStatus | SafetyStatus;
  className?: string;
}

const reviewConfig: Record<ReviewStatus, { label: string; classes: string }> = {
  direct_use: {
    label: '✅ 直接可用',
    classes: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  },
  need_review: {
    label: '⚠️ 需复核',
    classes: 'bg-amber-100 text-amber-800 border-amber-200',
  },
  rejected: {
    label: '❌ 不合格',
    classes: 'bg-rose-100 text-rose-800 border-rose-200',
  },
  pending: {
    label: '🔄 需补测',
    classes: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

const safetyConfig: Record<SafetyStatus, { label: string; classes: string }> = {
  pass: {
    label: 'PASS',
    classes: 'bg-emerald-500 text-white border-emerald-600 font-bold tracking-wide',
  },
  fail: {
    label: 'FAIL',
    classes: 'bg-rose-500 text-white border-rose-600 font-bold tracking-wide',
  },
  pending: {
    label: 'PENDING',
    classes: 'bg-slate-400 text-white border-slate-500 font-bold tracking-wide',
  },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const isReview = ['direct_use', 'need_review', 'rejected'].includes(status);
  const config = isReview
    ? reviewConfig[status as ReviewStatus]
    : safetyConfig[status as SafetyStatus];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-md text-xs border',
        config.classes,
        className
      )}
    >
      {config.label}
    </span>
  );
}
