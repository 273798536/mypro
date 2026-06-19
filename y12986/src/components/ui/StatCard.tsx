import React from 'react';

interface StatCardProps {
  label: string;
  value: React.ReactNode;
  subValue?: React.ReactNode;
  icon?: React.ReactNode;
  tone?: 'default' | 'primary' | 'amber' | 'emerald' | 'rose';
  className?: string;
}

const toneBg: Record<string, string> = {
  default: 'bg-gray-50 border-gray-200',
  primary: 'bg-primary-50 border-primary-200',
  amber: 'bg-amber-50 border-amber-200',
  emerald: 'bg-emerald-50 border-emerald-200',
  rose: 'bg-rose-50 border-rose-200',
};

const toneIcon: Record<string, string> = {
  default: 'text-gray-600',
  primary: 'text-primary-600',
  amber: 'text-amber-600',
  emerald: 'text-emerald-600',
  rose: 'text-rose-600',
};

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  icon,
  tone = 'default',
  className = '',
}) => (
  <div className={['data-card p-4', className].join(' ')}>
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <div className="text-xs text-gray-500 font-medium">{label}</div>
        <div className="mt-1.5 text-2xl font-bold text-gray-900 font-mono leading-none">
          {value}
        </div>
        {subValue !== undefined && (
          <div className="mt-1.5 text-xs text-gray-500">{subValue}</div>
        )}
      </div>
      {icon && (
        <div className={['flex-shrink-0 w-10 h-10 flex items-center justify-center border rounded-none', toneBg[tone]].join(' ')}>
          <span className={toneIcon[tone]}>{icon}</span>
        </div>
      )}
    </div>
  </div>
);
