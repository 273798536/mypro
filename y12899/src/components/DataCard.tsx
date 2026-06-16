import { cn } from '@/lib/utils';

interface DataCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  status?: 'normal' | 'warning' | 'critical' | 'info';
  icon?: React.ReactNode;
  onClick?: () => void;
  className?: string;
  children?: React.ReactNode;
}

const statusStyles = {
  normal: 'border-l-teal-500 bg-teal-50/50',
  warning: 'border-l-amber-500 bg-amber-50/50',
  critical: 'border-l-rose-500 bg-rose-50/50',
  info: 'border-l-sky-600 bg-sky-50/50',
};

const statusBadgeStyles = {
  normal: 'bg-teal-100 text-teal-700',
  warning: 'bg-amber-100 text-amber-700',
  critical: 'bg-rose-100 text-rose-700',
  info: 'bg-sky-100 text-sky-700',
};

const statusText = {
  normal: '正常',
  warning: '预警',
  critical: '异常',
  info: '信息',
};

export function DataCard({
  title,
  value,
  unit,
  subtitle,
  status = 'info',
  icon,
  onClick,
  className,
  children,
}: DataCardProps) {
  return (
    <div
      className={cn(
        'relative rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md',
        'border-l-4',
        statusStyles[status],
        onClick && 'cursor-pointer hover:border-slate-300',
        className
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            {icon && <span className="text-slate-500">{icon}</span>}
            <h3 className="text-sm font-medium text-slate-600">{title}</h3>
          </div>
          <div className="mt-2 flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-800">{value}</span>
            {unit && <span className="text-sm text-slate-500">{unit}</span>}
          </div>
          {subtitle && <p className="mt-1 text-xs text-slate-500">{subtitle}</p>}
          {children && <div className="mt-3">{children}</div>}
        </div>
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            statusBadgeStyles[status]
          )}
        >
          {statusText[status]}
        </span>
      </div>
    </div>
  );
}
