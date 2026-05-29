import { cn } from '../../lib/utils';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'critical';
  size?: 'sm' | 'md';
  className?: string;
  pulse?: boolean;
}

const variantStyles: Record<string, string> = {
  default: 'bg-slate-700/60 text-slate-200 border-slate-600',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  warning: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  danger: 'bg-red-500/20 text-red-400 border-red-500/30',
  critical: 'bg-red-900/40 text-red-300 border-red-600/50 animate-pulse',
  info: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-2 py-0.5 text-[10px]',
  md: 'px-2.5 py-0.5 text-xs',
};

export const Badge = ({ children, variant = 'default', size = 'md', className, pulse }: BadgeProps) => {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border backdrop-blur-sm',
        variantStyles[variant],
        sizeStyles[size],
        pulse && 'animate-pulse',
        className
      )}
    >
      {children}
    </span>
  );
};
