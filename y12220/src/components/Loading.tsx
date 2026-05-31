import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface LoadingProps {
  text?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Loading({
  text = '加载中...',
  className,
  size = 'md',
}: LoadingProps) {
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
  };

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-4',
        className
      )}
    >
      <Loader2
        className={cn(
          'animate-spin text-primary-600 mb-3',
          sizeClasses[size]
        )}
      />
      <p className="text-sm text-primary-500">{text}</p>
    </div>
  );
}

export function LoadingSkeleton({
  className,
  count = 3,
}: {
  className?: string;
  count?: number;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse bg-primary-100 rounded-lg h-16"
        />
      ))}
    </div>
  );
}

export function TableLoadingSkeleton({
  rows = 5,
  columns = 4,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="animate-pulse">
      <div className="bg-primary-100 h-12 rounded-t-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="border-t border-primary-100 bg-white py-4 px-4"
        >
          <div className="flex gap-4">
            {Array.from({ length: columns }).map((_, j) => (
              <div
                key={j}
                className="h-4 bg-primary-100 rounded flex-1"
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
