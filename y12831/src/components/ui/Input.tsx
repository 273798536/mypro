import React from 'react';
import clsx from 'clsx';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({ label, error, icon, className, id, ...props }) => {
  const inputId = id || React.useId();
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-paper-800 mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-paper-500">
            {icon}
          </div>
        )}
        <input
          id={inputId}
          className={clsx(
            'w-full px-4 py-2.5 text-sm border rounded-md',
            'bg-white text-paper-900 placeholder-paper-400',
            'border-paper-300 focus:border-deep-sea-500 focus:ring-2 focus:ring-deep-sea-100',
            'transition-all duration-200 outline-none',
            icon && 'pl-10',
            error && 'border-rust-red-400 focus:border-rust-red-500 focus:ring-rust-red-100',
            className
          )}
          {...props}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs text-rust-red-600">{error}</p>
      )}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({ label, error, className, id, rows = 4, ...props }) => {
  const inputId = id || React.useId();
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-paper-800 mb-1.5">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={rows}
        className={clsx(
          'w-full px-4 py-2.5 text-sm border rounded-md resize-none',
          'bg-white text-paper-900 placeholder-paper-400',
          'border-paper-300 focus:border-deep-sea-500 focus:ring-2 focus:ring-deep-sea-100',
          'transition-all duration-200 outline-none',
          error && 'border-rust-red-400 focus:border-rust-red-500 focus:ring-rust-red-100',
          className
        )}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs text-rust-red-600">{error}</p>
      )}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({ label, error, options, className, id, ...props }) => {
  const inputId = id || React.useId();
  
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-paper-800 mb-1.5">
          {label}
        </label>
      )}
      <select
        id={inputId}
        className={clsx(
          'w-full px-4 py-2.5 text-sm border rounded-md appearance-none cursor-pointer',
          'bg-white text-paper-900',
          'border-paper-300 focus:border-deep-sea-500 focus:ring-2 focus:ring-deep-sea-100',
          'transition-all duration-200 outline-none',
          'pr-10 bg-no-repeat bg-right',
          error && 'border-rust-red-400 focus:border-rust-red-500 focus:ring-rust-red-100',
          className
        )}
        style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.75rem center', backgroundSize: '1.25rem' }}
        {...props}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="mt-1 text-xs text-rust-red-600">{error}</p>
      )}
    </div>
  );
};
