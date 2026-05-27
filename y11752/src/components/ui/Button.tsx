import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

type Merge<P, T> = Omit<P, keyof T> & T;
type MotionButtonProps = Merge<ButtonHTMLAttributes<HTMLButtonElement>, HTMLMotionProps<'button'>>;

interface ButtonProps extends MotionButtonProps {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'font-semibold rounded-lg transition-all duration-200 transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2';
    
    const variants = {
      primary: 'bg-amber-600 hover:bg-amber-700 text-white shadow-lg hover:shadow-xl focus:ring-amber-500',
      secondary: 'bg-slate-700 hover:bg-slate-600 text-white shadow-md hover:shadow-lg focus:ring-slate-400',
      danger: 'bg-red-600 hover:bg-red-700 text-white shadow-md hover:shadow-lg focus:ring-red-400',
      outline: 'border-2 border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-white focus:ring-amber-400'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-5 py-2.5 text-base',
      lg: 'px-8 py-4 text-lg'
    };

    return (
      <motion.button
        ref={ref}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        whileHover={{ y: -2 }}
        whileTap={{ scale: 0.95 }}
        {...(props as any)}
      >
        {children}
      </motion.button>
    );
  }
);

Button.displayName = 'Button';
