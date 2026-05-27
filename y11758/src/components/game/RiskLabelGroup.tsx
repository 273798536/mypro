import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { RiskLabel } from '@/types';
import { cn } from '@/lib/utils';

interface RiskLabelGroupProps {
  labels: RiskLabel[];
  onToggle: (labelId: string) => void;
}

export const RiskLabelGroup: React.FC<RiskLabelGroupProps> = ({ labels, onToggle }) => {
  return (
    <div className="flex flex-wrap gap-2">
      <div className="flex items-center gap-2 text-slate-600 text-sm">
        <ShieldAlert className="w-4 h-4" />
        <span>风险标签:</span>
      </div>
      {labels.map(label => (
        <button
          key={label.id}
          onClick={() => onToggle(label.id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200',
            label.isChecked
              ? 'bg-red-500 text-white shadow-md'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          )}
          title={label.description}
        >
          {label.name}
        </button>
      ))}
    </div>
  );
};
