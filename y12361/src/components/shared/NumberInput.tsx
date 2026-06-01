import type { InputHTMLAttributes } from 'react';

interface NumberInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
  unit?: string;
  hint?: string;
  error?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  unit,
  hint,
  error,
  className = '',
  id,
  ...props
}: NumberInputProps) {
  const inputId = id || label.replace(/\s+/g, '-').toLowerCase();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    if (rawValue === '' || rawValue === '-') {
      onChange(null);
    } else {
      const num = parseFloat(rawValue);
      if (!isNaN(num)) {
        onChange(num);
      }
    }
  };

  return (
    <div className={`space-y-1.5 ${className}`}>
      <label
        htmlFor={inputId}
        className="block text-sm font-medium text-slate-700"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          type="number"
          value={value ?? ''}
          onChange={handleChange}
          className={`w-full px-4 py-2.5 pr-12 text-sm font-mono border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors ${
            error
              ? 'border-red-300 bg-red-50 focus:border-red-400'
              : 'border-slate-200 bg-white hover:border-slate-300 focus:border-blue-400'
          }`}
          {...props}
        />
        {unit && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-mono">
            {unit}
          </span>
        )}
      </div>
      {hint && !error && (
        <p className="text-xs text-slate-500">{hint}</p>
      )}
      {error && (
        <p className="text-xs text-red-500">{error}</p>
      )}
    </div>
  );
}
