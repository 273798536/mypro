import { InputHTMLAttributes, forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  unit?: string;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, unit, className, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');
    
    return (
      <div className="space-y-1.5">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={cn(
              'w-full px-3 py-2 text-sm border rounded-md transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-space-blue-500 focus:border-transparent',
              error
                ? 'border-error-red bg-red-50'
                : 'border-gray-300 hover:border-gray-400 bg-white',
              unit && 'pr-12',
              className
            )}
            {...props}
          />
          {unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
              {unit}
            </span>
          )}
        </div>
        {error && (
          <p className="text-xs text-error-red">{error}</p>
        )}
        {hint && !error && (
          <p className="text-xs text-gray-500">{hint}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
