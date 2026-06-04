import React from 'react';
import { cn } from '../../lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  color?: 'blue' | 'green' | 'amber' | 'red';
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, color = 'blue', className }: StatCardProps) {
  const gradientMap = {
    blue: 'from-blue-600 to-blue-800',
    green: 'from-emerald-600 to-emerald-800',
    amber: 'from-amber-600 to-amber-800',
    red: 'from-red-600 to-red-800',
  };

  const bgGradientMap = {
    blue: 'bg-gradient-to-br from-blue-50 to-white',
    green: 'bg-gradient-to-br from-emerald-50 to-white',
    amber: 'bg-gradient-to-br from-amber-50 to-white',
    red: 'bg-gradient-to-br from-red-50 to-white',
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl p-6 border border-gray-100 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5',
        bgGradientMap[color],
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 font-serif tracking-tight">
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>
          {trend && (
            <p className={cn(
              'text-xs mt-2 flex items-center gap-1',
              trend.isPositive ? 'text-emerald-600' : 'text-red-600'
            )}>
              {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
              <span className="text-gray-400 ml-1">较上周</span>
            </p>
          )}
        </div>
        <div className={cn(
          'p-3 rounded-xl bg-gradient-to-br shadow-lg',
          gradientMap[color]
        )}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
      <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full opacity-5 bg-gradient-to-br" style={{ background: color === 'blue' ? '#1e40af' : color === 'green' ? '#065f46' : color === 'amber' ? '#92400e' : '#991b1b' }} />
    </div>
  );
}
