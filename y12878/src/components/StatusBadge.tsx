import { cn } from '@/lib/utils';

type Status = 'pending' | 'approved' | 'rejected';

interface StatusBadgeProps {
  status: Status;
}

const statusConfig = {
  pending: {
    bg: 'bg-data-gold',
    text: 'text-white',
    label: '待确认',
  },
  approved: {
    bg: 'bg-ocean',
    text: 'text-white',
    label: '已通过',
  },
  rejected: {
    bg: 'bg-coral',
    text: 'text-white',
    label: '已驳回',
  },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        config.bg,
        config.text
      )}
    >
      <span className="relative flex h-2 w-2">
        <span className={cn('absolute inline-flex h-full w-full animate-ping rounded-full opacity-60', config.bg)} />
        <span className={cn('relative inline-flex h-2 w-2 rounded-full', config.bg)} />
      </span>
      {config.label}
    </span>
  );
}
