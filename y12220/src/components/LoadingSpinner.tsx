import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type LoadingSpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

interface LoadingSpinnerProps {
  size?: LoadingSpinnerSize;
  className?: string;
  label?: string;
}

const sizeClasses: Record<LoadingSpinnerSize, string> = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

export default function LoadingSpinner({
  size = 'md',
  className,
  label,
}: LoadingSpinnerProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center gap-2', className)}>
      <Loader2
        className={cn(
          'animate-spin text-primary-700 dark:text-primary-400',
          sizeClasses[size]
        )}
      />
      {label && (
        <span className="text-sm text-slate-600 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );
}
