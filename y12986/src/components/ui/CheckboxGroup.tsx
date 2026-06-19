import React, { useState } from 'react';
import { Check } from 'lucide-react';

export interface CheckboxGroupOption<T extends string = string> {
  label: string;
  value: T;
  tone?: string;
  count?: number;
}

interface CheckboxGroupProps<T extends string> {
  label: string;
  options: CheckboxGroupOption<T>[];
  value: T[];
  onChange: (val: T[]) => void;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

export function CheckboxGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  collapsible = false,
  defaultCollapsed = false,
}: CheckboxGroupProps<T>) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const toggle = (v: T) => {
    if (value.includes(v)) {
      onChange(value.filter((x) => x !== v));
    } else {
      onChange([...value, v]);
    }
  };

  const toggleAll = () => {
    if (value.length === options.length) {
      onChange([]);
    } else {
      onChange(options.map((o) => o.value));
    }
  };

  const allChecked = value.length === options.length;
  const someChecked = value.length > 0 && value.length < options.length;

  return (
    <div className="space-y-2">
      <div
        className={collapsible ? 'flex items-center justify-between cursor-pointer select-none' : ''}
        onClick={collapsible ? () => setCollapsed(!collapsed) : undefined}
      >
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            {label}
          </span>
          {value.length > 0 && (
            <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold bg-primary-600 text-white rounded-none">
              {value.length}
            </span>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleAll();
          }}
          className="text-[11px] text-gray-500 hover:text-primary-600 font-medium"
        >
          {allChecked ? '清空' : '全选'}
        </button>
      </div>
      {!collapsed && (
        <div className="space-y-1">
          {options.map((opt) => {
            const checked = value.includes(opt.value);
            return (
              <label
                key={opt.value}
                className="flex items-center gap-2 py-1 px-1.5 rounded-none hover:bg-gray-50 cursor-pointer group"
              >
                <span
                  className={[
                    'flex items-center justify-center w-4 h-4 border flex-shrink-0 transition-colors',
                    checked
                      ? 'bg-primary-600 border-primary-600'
                      : someChecked && value.length === 0
                      ? 'bg-white border-gray-300'
                      : 'bg-white border-gray-300 group-hover:border-primary-400',
                  ].join(' ')}
                  onClick={(e) => {
                    e.preventDefault();
                    toggle(opt.value);
                  }}
                >
                  {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                </span>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.value)}
                  className="sr-only"
                />
                <span
                  className={[
                    'text-sm flex-1 min-w-0 truncate',
                    checked ? 'text-gray-900 font-medium' : 'text-gray-600',
                  ].join(' ')}
                >
                  {opt.label}
                </span>
                {opt.count !== undefined && (
                  <span className="text-xs text-gray-400 font-mono">{opt.count}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}
