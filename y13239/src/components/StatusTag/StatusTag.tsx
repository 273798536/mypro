import { cn } from '@/lib/utils';
import { statusLabels } from '@/data/mockData';
import type { MaterialStatus } from '@/types';

interface StatusTagProps {
  status: MaterialStatus;
  size?: 'sm' | 'md';
}

const statusStyles: Record<MaterialStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  processing: 'bg-blue-100 text-blue-800 border-blue-200',
  confirmed: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  mismatch: 'bg-purple-100 text-purple-800 border-purple-200',
  annotated: 'bg-amber-100 text-amber-800 border-amber-300',
};

const sizeStyles = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-sm',
};

export default function StatusTag({ status, size = 'md' }: StatusTagProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-medium rounded-md border',
        statusStyles[status],
        sizeStyles[size]
      )}
    >
      <span
        className={cn(
          'w-1.5 h-1.5 rounded-full mr-1.5',
          status === 'pending' && 'bg-amber-500',
          status === 'processing' && 'bg-blue-500',
          status === 'confirmed' && 'bg-emerald-500',
          status === 'mismatch' && 'bg-purple-500',
          status === 'annotated' && 'bg-amber-600'
        )}
      />
      {statusLabels[status]}
    </span>
  );
}
