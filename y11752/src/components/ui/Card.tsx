import { HTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

type Merge<P, T> = Omit<P, keyof T> & T;
type MotionDivProps = Merge<HTMLAttributes<HTMLDivElement>, HTMLMotionProps<'div'>>;

interface CardProps extends MotionDivProps {
  variant?: 'default' | 'elevated' | 'outlined';
  hoverable?: boolean;
}

export const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant = 'default', hoverable = false, children, ...props }, ref) => {
    const baseStyles = 'rounded-xl bg-white overflow-hidden';
    
    const variants = {
      default: 'shadow-md',
      elevated: 'shadow-xl',
      outlined: 'border-2 border-slate-200 shadow-sm'
    };

    const hoverStyles = hoverable 
      ? 'cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1' 
      : '';

    return (
      <motion.div
        ref={ref}
        className={cn(baseStyles, variants[variant], hoverStyles, className)}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        {...(props as any)}
      >
        {children}
      </motion.div>
    );
  }
);

Card.displayName = 'Card';

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4 border-b border-slate-100', className)} {...props}>
      {children}
    </div>
  )
);

CardHeader.displayName = 'CardHeader';

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  )
);

CardContent.displayName = 'CardContent';

export const CardFooter = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, children, ...props }, ref) => (
    <div ref={ref} className={cn('px-6 py-4 border-t border-slate-100 bg-slate-50', className)} {...props}>
      {children}
    </div>
  )
);

CardFooter.displayName = 'CardFooter';
