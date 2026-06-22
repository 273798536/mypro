import React from 'react';
import { cn } from '../../lib/utils';

export interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  description?: string;
  className?: string;
}

const Toggle: React.FC<ToggleProps> = ({
  label,
  checked,
  onChange,
  description,
  className,
}) => {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-ink-300 focus:ring-offset-2 mt-0.5',
          checked ? 'bg-ink-600' : 'bg-parchment-300'
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out',
            checked ? 'translate-x-5' : 'translate-x-0'
          )}
        />
      </button>
      <div className="flex flex-col">
        <span className="text-sm font-medium text-ink-700 font-serif">
          {label}
        </span>
        {description && (
          <span className="text-xs text-charcoal-500 mt-0.5">
            {description}
          </span>
        )}
      </div>
    </div>
  );
};

export default Toggle;
