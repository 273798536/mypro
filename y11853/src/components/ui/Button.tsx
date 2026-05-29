import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  active?: boolean;
}

export function Button({
  children,
  className,
  variant = 'secondary',
  size = 'md',
  active = false,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]';
  
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-cyan-500 text-white hover:from-emerald-400 hover:to-cyan-400 focus:ring-emerald-500/50 shadow-lg shadow-emerald-500/25 hover:scale-[1.02]',
    secondary: 'bg-slate-800/80 text-slate-200 border border-slate-600/50 hover:bg-slate-700/80 hover:border-slate-500/50 focus:ring-slate-500/50 hover:scale-[1.02]',
    ghost: 'bg-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 focus:ring-slate-500/30 hover:scale-[1.02]',
    danger: 'bg-gradient-to-r from-red-500 to-orange-500 text-white hover:from-red-400 hover:to-orange-400 focus:ring-red-500/50 shadow-lg shadow-red-500/25 hover:scale-[1.02]',
  };
  
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
  };
  
  const activeStyles = active
    ? 'ring-2 ring-emerald-400/70 ring-offset-2 ring-offset-slate-900'
    : '';
  
  const disabledStyles = disabled ? 'hover:scale-100 active:scale-100' : '';
  
  return (
    <button
      className={cn(
        baseStyles,
        variants[variant],
        sizes[size],
        activeStyles,
        disabledStyles,
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}
