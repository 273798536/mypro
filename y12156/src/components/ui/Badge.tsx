import { ReactNode } from 'react';
import { cn } from '../../lib/utils';

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'amber' | 'secondary';

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants: Record<BadgeVariant, string> = {
    default: 'bg-slate-100 text-slate-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-yellow-100 text-yellow-700',
    danger: 'bg-red-100 text-red-700',
    info: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    secondary: 'bg-slate-100 text-slate-700',
  };

  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}
