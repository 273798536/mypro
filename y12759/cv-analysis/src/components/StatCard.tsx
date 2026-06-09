import React from 'react';

interface StatCardProps {
  label: string;
  value: number | string;
  tone?: 'default' | 'danger' | 'warning' | 'success' | 'primary';
  icon?: string;
  subtitle?: string;
}

const toneMap: Record<string, string> = {
  default: 'bg-white border-slate-200 text-slate-700',
  danger: 'bg-red-50 border-red-200 text-red-700',
  warning: 'bg-amber-50 border-amber-200 text-amber-700',
  success: 'bg-emerald-50 border-emerald-200 text-emerald-700',
  primary: 'bg-blue-50 border-blue-200 text-blue-700',
};

const valueToneMap: Record<string, string> = {
  default: 'text-slate-900',
  danger: 'text-red-600',
  warning: 'text-amber-600',
  success: 'text-emerald-600',
  primary: 'text-blue-600',
};

export const StatCard: React.FC<StatCardProps> = ({ label, value, tone = 'default', icon, subtitle }) => {
  return (
    <div className={`rounded-xl border p-4 shadow-sm transition hover:shadow ${toneMap[tone]}`}>
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm font-medium opacity-80">{label}</div>
          <div className={`mt-2 text-3xl font-bold ${valueToneMap[tone]}`}>{value}</div>
          {subtitle && <div className="mt-1 text-xs opacity-70">{subtitle}</div>}
        </div>
        {icon && <div className="text-2xl opacity-60">{icon}</div>}
      </div>
    </div>
  );
};
