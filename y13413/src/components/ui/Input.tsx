import React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, ...props }, ref) => {
    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-ink-700 mb-1.5 font-serif">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={cn(
            'w-full px-4 py-2.5 bg-white border border-parchment-300 rounded-md text-charcoal-700 placeholder-charcoal-400 font-mono text-sm focus:outline-none focus:border-ink-400 focus:ring-2 focus:ring-ink-100 transition-all duration-200',
            error && 'border-vermilion-400 focus:border-vermilion-500 focus:ring-vermilion-100',
            className
          )}
          {...props}
        />
        {error && (
          <p className="mt-1 text-xs text-vermilion-600 font-mono">
            {error}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
