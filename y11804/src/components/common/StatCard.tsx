import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: ReactNode;
  color?: 'emerald' | 'blue' | 'amber' | 'red' | 'gray';
  onClick?: () => void;
}

const colorClasses = {
  emerald: 'from-emerald-500 to-emerald-600',
  blue: 'from-blue-500 to-blue-600',
  amber: 'from-amber-500 to-amber-600',
  red: 'from-red-500 to-red-600',
  gray: 'from-gray-500 to-gray-600',
};

export const StatCard = ({ title, value, subtitle, icon, color = 'blue', onClick }: StatCardProps) => {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {icon && (
          <div
            className={`p-3 rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg`}
          >
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};
