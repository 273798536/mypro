import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type CardVariant = 'default' | 'warning' | 'danger' | 'success' | 'hot';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  glow?: boolean;
}

const variantStyles: Record<CardVariant, string> = {
  default: 'bg-[#3D3833] border-[#5D554D]',
  warning: 'bg-[#5D4A2E] border-[#FFD54F]',
  danger: 'bg-[#5D2E2E] border-[#D32F2F]',
  success: 'bg-[#2E5D3A] border-[#81C784]',
  hot: 'bg-[#5D3A2E] border-[#FF7A18]',
};

const glowStyles: Record<CardVariant, string> = {
  default: '',
  warning: 'shadow-[0_0_20px_rgba(255,213,79,0.3)]',
  danger: 'shadow-[0_0_20px_rgba(211,47,47,0.3)] animate-pulse',
  success: 'shadow-[0_0_20px_rgba(129,199,132,0.3)]',
  hot: 'shadow-[0_0_30px_rgba(255,122,24,0.5)] animate-[glow_2s_ease-in-out_infinite]',
};

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', glow = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'rounded-xl border-2 backdrop-blur-sm',
          'transition-all duration-300',
          variantStyles[variant],
          glow && glowStyles[variant],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';
