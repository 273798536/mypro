import { cn } from '@/lib/utils';

export type SpinnerSize = 'sm' | 'md' | 'lg' | 'xl';

export interface LoadingSpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeStyles: Record<SpinnerSize, string> = {
  sm: 'w-4 h-4 border-2',
  md: 'w-6 h-6 border-2',
  lg: 'w-8 h-8 border-3',
  xl: 'w-12 h-12 border-4',
};

export const LoadingSpinner = ({
  size = 'md',
  className,
}: LoadingSpinnerProps) => {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-slate-200 border-t-primary-500',
        sizeStyles[size],
        className
      )}
    />
  );
};

export interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  fullScreen?: boolean;
  className?: string;
}

export const LoadingOverlay = ({
  visible,
  text = '加载中...',
  fullScreen = false,
  className,
}: LoadingOverlayProps) => {
  if (!visible) return null;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 bg-white/80 backdrop-blur-sm z-40',
        fullScreen
          ? 'fixed inset-0'
          : 'absolute inset-0',
        className
      )}
    >
      <LoadingSpinner size="lg" />
      {text && <span className="text-sm text-slate-600 font-medium">{text}</span>}
    </div>
  );
};

export const LoadingPage = ({ text = '加载中...' }: { text?: string }) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4">
        <LoadingSpinner size="xl" />
        <p className="text-slate-600 font-medium">{text}</p>
      </div>
    </div>
  );
};
