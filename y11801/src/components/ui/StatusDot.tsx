import { cn } from '@/lib/utils';

export type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'default';

export interface StatusDotProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  success: 'bg-success-500',
  warning: 'bg-warning-500',
  danger: 'bg-danger-500',
  info: 'bg-sky-500',
  default: 'bg-slate-400',
};

const statusGlowColors: Record<StatusType, string> = {
  success: 'shadow-success-500/50',
  warning: 'shadow-warning-500/50',
  danger: 'shadow-danger-500/50',
  info: 'shadow-sky-500/50',
  default: 'shadow-slate-400/50',
};

const sizeStyles = {
  sm: 'w-2 h-2',
  md: 'w-3 h-3',
  lg: 'w-4 h-4',
};

export const StatusDot = ({
  status = 'default',
  size = 'md',
  pulse = false,
  className,
}: StatusDotProps) => {
  return (
    <span
      className={cn(
        'inline-flex rounded-full',
        statusColors[status],
        sizeStyles[size],
        pulse && 'animate-pulse shadow-lg',
        pulse && statusGlowColors[status],
        className
      )}
    />
  );
};

export interface StatusIndicatorProps {
  status: StatusType;
  label: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

export const StatusIndicator = ({
  status,
  label,
  size = 'md',
  pulse = false,
  className,
}: StatusIndicatorProps) => {
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-sm' : 'text-xs';
  
  return (
    <div className={cn('inline-flex items-center gap-1.5', className)}>
      <StatusDot status={status} size={size} pulse={pulse} />
      <span className={cn('font-medium text-slate-600', textSize)}>{label}</span>
    </div>
  );
};
