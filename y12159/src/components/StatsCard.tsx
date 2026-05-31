import type { ResultStatus } from '@/types';
import { CheckCircle, AlertTriangle, XCircle, HelpCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  status: ResultStatus;
  count: number;
  total: number;
}

const statusConfig: Record<ResultStatus, {
  label: string;
  icon: typeof CheckCircle;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  PASS: {
    label: '通过',
    icon: CheckCircle,
    bgColor: 'bg-success/10',
    textColor: 'text-success',
    borderColor: 'border-success/30',
  },
  WARNING: {
    label: '警告',
    icon: AlertTriangle,
    bgColor: 'bg-warning/10',
    textColor: 'text-warning',
    borderColor: 'border-warning/30',
  },
  FAIL: {
    label: '失败',
    icon: XCircle,
    bgColor: 'bg-danger/10',
    textColor: 'text-danger',
    borderColor: 'border-danger/30',
  },
  MISSING: {
    label: '缺失',
    icon: HelpCircle,
    bgColor: 'bg-industrial-muted/10',
    textColor: 'text-industrial-muted',
    borderColor: 'border-industrial-muted/30',
  },
};

export default function StatsCard({ status, count, total }: StatsCardProps) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const percentage = total > 0 ? ((count / total) * 100).toFixed(1) : '0';

  return (
    <div className={cn(
      'industrial-card p-5 border-l-4',
      config.borderColor
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-industrial-muted mb-1">{config.label}区段</p>
          <div className="flex items-baseline gap-2">
            <span className={cn('text-4xl font-bold font-mono', config.textColor)}>
              {count}
            </span>
            <span className="text-sm text-industrial-muted">
              / {total} ({percentage}%)
            </span>
          </div>
        </div>
        <div className={cn('p-3 rounded-sm', config.bgColor)}>
          <Icon size={24} className={config.textColor} />
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-industrial-bg rounded-sm overflow-hidden">
        <div
          className={cn('h-full transition-all duration-500', config.bgColor.replace('/10', ''))}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
