import { SampleStatus } from '@/types';
import { cn } from '@/lib/utils';

interface StatusTagProps {
  status: SampleStatus;
  size?: 'sm' | 'md';
}

const statusConfig = {
  [SampleStatus.PENDING]: {
    label: '待检测',
    className: 'bg-slate-100 text-slate-600 border-slate-200'
  },
  [SampleStatus.TESTING]: {
    label: '检测中',
    className: 'bg-blue-100 text-blue-700 border-blue-200'
  },
  [SampleStatus.COMPLETED]: {
    label: '已完成',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200'
  },
  [SampleStatus.ABNORMAL]: {
    label: '异常',
    className: 'bg-rose-100 text-rose-700 border-rose-200'
  }
};

export default function StatusTag({ status, size = 'md' }: StatusTagProps) {
  const config = statusConfig[status] || statusConfig[SampleStatus.PENDING];

  return (
    <span
      className={cn(
        'inline-flex items-center border rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm',
        config.className
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === SampleStatus.PENDING && 'bg-slate-400',
          status === SampleStatus.TESTING && 'bg-blue-500 animate-pulse',
          status === SampleStatus.COMPLETED && 'bg-emerald-500',
          status === SampleStatus.ABNORMAL && 'bg-rose-500'
        )}
      />
      {config.label}
    </span>
  );
}
