import { cn } from '@/lib/utils';

type BadgeVariant =
  | 'default'
  | 'supplement'
  | 'recalibration'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100 text-neutral-600',
  supplement: 'bg-supplement-100 text-supplement-700',
  recalibration: 'bg-recalibration-100 text-recalibration-700',
  success: 'bg-success-100 text-success-700',
  warning: 'bg-warning-100 text-warning-700',
  danger: 'bg-red-100 text-red-700',
  info: 'bg-medical-100 text-medical-700',
};

export default function Badge({
  variant = 'default',
  children,
  className = '',
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xxs font-medium rounded-sm',
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
