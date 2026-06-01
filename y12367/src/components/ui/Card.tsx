import * as React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  borderColor?: 'default' | 'blue' | 'orange' | 'red' | 'green';
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, glow, borderColor = 'default', ...props }, ref) => {
    const borderColors = {
      default: 'border-industrial-border',
      blue: 'border-blue-500/50',
      orange: 'border-orange-500/50',
      red: 'border-red-500/50',
      green: 'border-green-500/50',
    };

    return (
      <div
        ref={ref}
        className={cn(
          'industrial-card',
          glow && 'border-glow-blue',
          borderColors[borderColor],
          className
        )}
        {...props}
      />
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('flex items-center justify-between mb-4 pb-3 border-b border-industrial-border', className)} {...props} />
  )
);

CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn('text-lg font-semibold text-industrial-text', className)} {...props} />
  )
);

CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn('text-sm text-industrial-text-muted', className)} {...props} />
  )
);

CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn(className)} {...props} />
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn('mt-4 pt-3 border-t border-industrial-border flex items-center justify-between', className)} {...props} />
  )
);

CardFooter.displayName = 'CardFooter';
