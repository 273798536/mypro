import React from 'react';
import { cn } from '@/lib/utils';

interface DataLabelProps {
  value: string | number;
  unit?: string;
  label?: string;
  status?: 'normal' | 'warning' | 'danger';
  className?: string;
}

export const DataLabel: React.FC<DataLabelProps> = ({
  value,
  unit,
  label,
  status = 'normal',
  className,
}) => {
  const statusColors = {
    normal: 'border-slate-400 bg-slate-800/80 text-slate-100',
    warning: 'border-amber-500 bg-amber-900/80 text-amber-100',
    danger: 'border-red-500 bg-red-900/80 text-red-100',
  };

  return (
    <div
      className={cn(
        'inline-flex flex-col border-2 rounded px-2 py-1 font-mono text-xs backdrop-blur-sm',
        statusColors[status],
        className
      )}
    >
      {label && <span className="text-[10px] opacity-80">{label}</span>}
      <span className="font-bold">
        {value}
        {unit && <span className="ml-0.5 opacity-80">{unit}</span>}
      </span>
    </div>
  );
};
