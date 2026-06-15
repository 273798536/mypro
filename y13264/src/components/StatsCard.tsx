import { cn } from '../lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: string;
  delay?: number;
}

export function StatsCard({ title, value, icon: Icon, color, delay = 0 }: StatsCardProps) {
  return (
    <div
      className="bg-white rounded-xl p-5 shadow-sm border border-slate-200 hover:shadow-md hover:-translate-y-0.5 transition-all duration-300"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500 mb-1 font-medium">{title}</p>
          <p className="text-3xl font-bold text-slate-800 tracking-tight">
            {value}
          </p>
        </div>
        <div className={cn(
          'w-12 h-12 rounded-xl flex items-center justify-center',
          color
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}
