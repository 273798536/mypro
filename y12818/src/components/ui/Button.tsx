import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

// 按钮变体类型
export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

// 按钮大小类型
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

// 按钮变体样式映射
const variantStyles: Record<ButtonVariant, string> = {
  primary:
    'bg-blue-600 text-white shadow-sm hover:bg-blue-700 focus:ring-blue-500/50 dark:bg-blue-500 dark:hover:bg-blue-600',
  secondary:
    'bg-white text-slate-900 border border-slate-300 shadow-sm hover:bg-slate-50 focus:ring-slate-500/20 dark:bg-slate-800 dark:text-white dark:border-slate-700 dark:hover:bg-slate-700',
  ghost:
    'bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 focus:ring-slate-500/20 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white',
  danger:
    'bg-red-600 text-white shadow-sm hover:bg-red-700 focus:ring-red-500/50 dark:bg-red-500 dark:hover:bg-red-600',
};

// 按钮大小样式映射
const sizeStyles: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5',
  md: 'h-10 px-4 text-sm gap-2',
  lg: 'h-12 px-6 text-base gap-2',
  icon: 'h-10 w-10 p-0',
};

// 通用按钮组件，支持多种变体、大小、加载状态和图标
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      loading = false,
      disabled,
      leftIcon,
      rightIcon,
      children,
      ...props
    },
    ref,
  ) => {
    return (
      <button
        ref={ref}
        disabled={loading || disabled}
        className={cn(
          'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-900',
          'disabled:opacity-50 disabled:pointer-events-none disabled:cursor-not-allowed',
          variantStyles[variant],
          sizeStyles[size],
          className,
        )}
        {...props}
      >
        {loading && <Loader2 size={16} className="animate-spin shrink-0" />}
        {!loading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {size !== 'icon' && children && <span>{children}</span>}
        {!loading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);

Button.displayName = 'Button';

export default Button;
