import { LucideIcon } from 'lucide-react';

interface Props {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  className?: string;
  iconBg?: string;
}

export default function DataCard({ 
  title, 
  value, 
  icon: Icon, 
  trend, 
  trendUp, 
  className = '',
  iconBg = 'bg-primary-50'
}: Props) {
  return (
    <div className={`card ${className} animate-fade-in`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm text-gray-500 mb-1">{title}</p>
          <p className="text-2xl font-bold text-gray-800 font-serif">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trendUp ? 'text-emerald-600' : 'text-red-500'}`}>
              {trend}
            </p>
          )}
        </div>
        <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
          <Icon className="w-6 h-6 text-primary-600" />
        </div>
      </div>
    </div>
  );
}
