import type { SampleStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: SampleStatus;
  className?: string;
}

const statusConfig: Record<SampleStatus, { label: string; variant: string }> = {
  pending: { label: '待估算', variant: 'bg-slate-100 text-slate-600' },
  estimating: { label: '估算中', variant: 'bg-brand-100 text-brand-700 animate-pulse' },
  estimated: { label: '已估算', variant: 'bg-brand-100 text-brand-700' },
  corrected: { label: '已修正', variant: 'bg-accent-100 text-accent-700' },
  confirmed: { label: '已确认', variant: 'bg-accent-100 text-accent-700' },
  exported: { label: '已导出', variant: 'bg-slate-200 text-slate-700' },
  anomaly: { label: '异常', variant: 'bg-warning-100 text-warning-700' },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.pending;

  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full',
        config.variant,
        className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'estimating' ? 'bg-brand-500 animate-pulse' : '',
          status === 'anomaly' ? 'bg-warning-500' : '',
          status === 'confirmed' || status === 'corrected' ? 'bg-accent-500' : '',
          status === 'estimated' ? 'bg-brand-500' : '',
          status === 'pending' ? 'bg-slate-400' : '',
          status === 'exported' ? 'bg-slate-500' : ''
        )}
      />
      {config.label}
    </span>
  );
}
