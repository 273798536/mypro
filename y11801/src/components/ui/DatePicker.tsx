import { forwardRef, type InputHTMLAttributes, useState } from 'react';
import { cn } from '@/lib/utils';
import { Calendar } from 'lucide-react';

export interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  format?: string;
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  (
    {
      className,
      label,
      error,
      helperText,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [isFocused, setIsFocused] = useState(false);

    const displayValue = value || '';

    return (
      <div className="w-full">
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {props.required && <span className="text-danger-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <Calendar className={cn(
            'absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors',
            isFocused ? 'text-primary-500' : 'text-slate-400'
          )} />
          <input
            ref={ref}
            type="date"
            value={displayValue}
            onChange={onChange}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            className={cn(
              'w-full px-4 pl-10 py-2.5 text-sm border border-slate-300 rounded-lg bg-white transition-all duration-200',
              'placeholder:text-slate-400',
              'focus:outline-none focus:ring-2 focus:ring-primary-500/30 focus:border-primary-500',
              'disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed',
              error && 'border-danger-500 focus:border-danger-500 focus:ring-danger-500/30',
              className
            )}
            {...props}
          />
        </div>
        {error && <p className="mt-1.5 text-sm text-danger-600">{error}</p>}
        {helperText && !error && (
          <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
        )}
      </div>
    );
  }
);

DatePicker.displayName = 'DatePicker';

export interface DateRangePickerProps {
  label?: string;
  startDate: string;
  endDate: string;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
  error?: string;
  helperText?: string;
  className?: string;
  startPlaceholder?: string;
  endPlaceholder?: string;
}

export const DateRangePicker = ({
  label,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  error,
  helperText,
  className,
  startPlaceholder = '开始日期',
  endPlaceholder = '结束日期',
}: DateRangePickerProps) => {
  return (
    <div className={cn('w-full', className)}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          {label}
        </label>
      )}
      <div className="flex items-center gap-2">
        <DatePicker
          value={startDate}
          onChange={(e) => onStartDateChange(e.target.value)}
          placeholder={startPlaceholder}
          className={cn(error && 'border-danger-500')}
        />
        <span className="text-slate-400">至</span>
        <DatePicker
          value={endDate}
          onChange={(e) => onEndDateChange(e.target.value)}
          placeholder={endPlaceholder}
          className={cn(error && 'border-danger-500')}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-danger-600">{error}</p>}
      {helperText && !error && (
        <p className="mt-1.5 text-sm text-slate-500">{helperText}</p>
      )}
    </div>
  );
};
