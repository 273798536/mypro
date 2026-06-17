import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number | string;
  color: string;
  icon: ReactNode;
}

export default function StatsCard({ title, value, color, icon }: StatsCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md',
        'border-l-4'
      )}
      style={{ borderLeftColor: color }}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-1 font-mono text-3xl font-bold text-gray-900">{value}</p>
        </div>
        <div
          className="flex h-12 w-12 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${color}20`, color }}
        >
          {icon}
        </div>
      </div>
    </div>
  );
}
