import { cn } from '../../lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  active?: boolean;
}

const variantStyles: Record<string, string> = {
  primary: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 hover:bg-cyan-500/30 hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/20',
  secondary: 'bg-slate-700/50 text-slate-200 border-slate-600 hover:bg-slate-600/50 hover:border-slate-500',
  ghost: 'bg-transparent text-slate-400 border-transparent hover:bg-slate-700/30 hover:text-cyan-300',
  danger: 'bg-red-500/20 text-red-400 border-red-500/40 hover:bg-red-500/30',
  success: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 hover:bg-emerald-500/30',
};

const sizeStyles: Record<string, string> = {
  sm: 'px-2.5 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-3 text-base',
  icon: 'p-2',
};

export const Button = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  active,
  className, 
  disabled,
  ...props 
}: ButtonProps) => {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg border font-medium transition-all duration-200 backdrop-blur-sm',
        'focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:ring-offset-2 focus:ring-offset-slate-900',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:transform-none',
        variantStyles[variant],
        sizeStyles[size],
        active && 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-900',
        className
      )}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
