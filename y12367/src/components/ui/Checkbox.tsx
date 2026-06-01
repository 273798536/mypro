import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  indeterminate?: boolean;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, checked, onChange, indeterminate, ...props }, ref) => {
    const inputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
      if (inputRef.current && typeof indeterminate === 'boolean') {
        inputRef.current.indeterminate = indeterminate;
      }
    }, [indeterminate]);

    const mergedRef = (node: HTMLInputElement | null) => {
      (inputRef as React.MutableRefObject<HTMLInputElement | null>).current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        ref.current = node;
      }
    };

    return (
      <label className="inline-flex items-center cursor-pointer">
        <div className="relative">
          <input
            ref={mergedRef}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="sr-only"
            {...props}
          />
          <div
            className={cn(
              'w-5 h-5 border-2 rounded flex items-center justify-center transition-all duration-200',
              checked || indeterminate
                ? 'border-blue-500 bg-blue-500'
                : 'border-industrial-border bg-industrial-bg hover:border-industrial-border-light',
              className
            )}
          >
            {checked && !indeterminate && <Check className="w-3 h-3 text-white" />}
            {indeterminate && <div className="w-3 h-0.5 bg-white" />}
          </div>
        </div>
        {label && <span className="ml-2 text-sm text-industrial-text">{label}</span>}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';
