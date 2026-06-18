import { cn } from '@/lib/utils';
import type { ArchiveRecord } from '@/types';
import { Database, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

interface StatsCardProps {
  records: ArchiveRecord[];
}

export function StatsCard({ records }: StatsCardProps) {
  const total = records.length;
  const success = records.filter((r) => r.status === 'success').length;
  const pending = records.filter((r) => r.status === 'pending').length;
  const error = records.filter((r) => r.status === 'error').length;

  const stats = [
    {
      label: '总记录数',
      value: total,
      icon: Database,
      color: 'text-slate-600',
      bg: 'bg-slate-50',
      border: 'border-slate-200',
    },
    {
      label: '顺利',
      value: success,
      icon: CheckCircle,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
    },
    {
      label: '待确认',
      value: pending,
      icon: AlertTriangle,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      label: '异常',
      value: error,
      icon: XCircle,
      color: 'text-red-600',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className={cn(
            'flex items-center gap-4 p-4 border rounded-lg',
            stat.bg,
            stat.border
          )}
        >
          <div className={cn('p-2 rounded-md bg-white border', stat.border)}>
            <stat.icon className={cn('w-5 h-5', stat.color)} />
          </div>
          <div>
            <p className="text-sm text-slate-500">{stat.label}</p>
            <p className={cn('text-2xl font-bold font-mono', stat.color)}>
              {stat.value}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
