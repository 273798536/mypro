import React, { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface TechInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  warning?: string;
  unit?: string;
  unitOptions?: string[];
  onUnitChange?: (unit: string) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}

export const TechInput = forwardRef<HTMLInputElement, TechInputProps>(
  ({ label, error, warning, unit, unitOptions, onUnitChange, className, prefix, suffix, id, ...props }, ref) => {
    const inputId = id || React.useId();
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="tech-label">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 text-industrial-textMuted text-sm">
              {prefix}
            </div>
          )}
          <input
            id={inputId}
            ref={ref}
            className={cn(
              'tech-input w-full',
              prefix && 'pl-9',
              (unit || suffix) && 'pr-20',
              error && 'border-danger-500 focus:border-danger-400',
              warning && !error && 'border-warning-500 focus:border-warning-400',
              className
            )}
            {...props}
          />
          {unitOptions && onUnitChange ? (
            <select
              value={unit}
              onChange={(e) => onUnitChange(e.target.value)}
              className="absolute right-1 h-7 bg-primary-900 border border-industrial-border rounded px-2 text-xs font-mono text-industrial-text focus:outline-none focus:border-primary-400 cursor-pointer"
            >
              {unitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          ) : unit && (
            <div className="absolute right-3 text-xs font-mono text-industrial-textMuted">
              {unit}
            </div>
          )}
          {suffix && !unit && (
            <div className="absolute right-3 text-industrial-textMuted text-sm">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-1 text-xs text-danger-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-danger-500" />
            {error}
          </p>
        )}
        {warning && !error && (
          <p className="mt-1 text-xs text-warning-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-warning-500" />
            {warning}
          </p>
        )}
      </div>
    );
  }
);

TechInput.displayName = 'TechInput';

interface TechSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'prefix'> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  prefix?: React.ReactNode;
}

export const TechSelect = forwardRef<HTMLSelectElement, TechSelectProps>(
  ({ label, error, options, className, prefix, id, ...props }, ref) => {
    const inputId = id || React.useId();
    
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="tech-label">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {prefix && (
            <div className="absolute left-3 text-industrial-textMuted text-sm">
              {prefix}
            </div>
          )}
          <select
            id={inputId}
            ref={ref}
            className={cn(
              'tech-input w-full appearance-none cursor-pointer pr-10',
              prefix && 'pl-9',
              error && 'border-danger-500 focus:border-danger-400',
              className
            )}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-primary-900">
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute right-3 text-industrial-textMuted pointer-events-none">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && (
          <p className="mt-1 text-xs text-danger-400">{error}</p>
        )}
      </div>
    );
  }
);

TechSelect.displayName = 'TechSelect';
