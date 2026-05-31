import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success' | 'warning';
type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-[#FF7A18] hover:bg-[#E66A00] text-white shadow-[0_4px_0_#B35000] hover:shadow-[0_6px_0_#B35000] active:shadow-[0_2px_0_#B35000] active:translate-y-0.5',
  secondary: 'bg-[#1565C0] hover:bg-[#0D47A1] text-white shadow-[0_4px_0_#0A306E] hover:shadow-[0_6px_0_#0A306E] active:shadow-[0_2px_0_#0A306E] active:translate-y-0.5',
  danger: 'bg-[#D32F2F] hover:bg-[#B71C1C] text-white shadow-[0_4px_0_#7F0000] hover:shadow-[0_6px_0_#7F0000] active:shadow-[0_2px_0_#7F0000] active:translate-y-0.5',
  ghost: 'bg-transparent hover:bg-white/10 text-white border border-white/20',
  success: 'bg-[#81C784] hover:bg-[#66BB6A] text-white shadow-[0_4px_0_#2E7D32] hover:shadow-[0_6px_0_#2E7D32] active:shadow-[0_2px_0_#2E7D32] active:translate-y-0.5',
  warning: 'bg-[#FFD54F] hover:bg-[#FFCA28] text-gray-900 shadow-[0_4px_0_#F57F17] hover:shadow-[0_6px_0_#F57F17] active:shadow-[0_2px_0_#F57F17] active:translate-y-0.5',
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm rounded-md',
  md: 'px-4 py-2 text-base rounded-lg',
  lg: 'px-6 py-3 text-lg rounded-xl',
  xl: 'px-8 py-4 text-xl rounded-2xl',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          'font-bold transition-all duration-150 transform',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none disabled:hover:transform-none',
          'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#FF7A18]/50',
          variantStyles[variant],
          sizeStyles[size],
          className
        )}
        disabled={disabled}
        {...props}
      />
    );
  }
);

Button.displayName = 'Button';
