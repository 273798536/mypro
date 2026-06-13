import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, AlertTriangle, AlertOctagon } from 'lucide-react';

export type StatusType = 'normal' | 'warning' | 'critical';

interface StatusBadgeProps {
  status: StatusType;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<StatusType, { label: string; bgColor: string; textColor: string; icon: React.ReactNode; dotColor: string }> = {
  normal: {
    label: '正常',
    bgColor: 'bg-teal-glow/15',
    textColor: 'text-teal-glow',
    dotColor: 'bg-teal-glow',
    icon: <CheckCircle className="w-4 h-4" />,
  },
  warning: {
    label: '预警',
    bgColor: 'bg-amber-warn/15',
    textColor: 'text-amber-warn',
    dotColor: 'bg-amber-warn',
    icon: <AlertTriangle className="w-4 h-4" />,
  },
  critical: {
    label: '临界',
    bgColor: 'bg-orange-alert/15',
    textColor: 'text-orange-alert',
    dotColor: 'bg-orange-alert',
    icon: <AlertOctagon className="w-4 h-4" />,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md', showIcon = false, className }) => {
  const config = statusConfig[status];
  
  const sizeClasses = {
    sm: 'text-[10px] px-1.5 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };
  
  return (
    <span
      className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded-full',
      config.bgColor,
      config.textColor,
      sizeClasses[size],
      className
    )}
    >
      {showIcon ? config.icon : <span className={cn('w-1.5 h-1.5 rounded-full', config.dotColor)} />}
      <span>{config.label}</span>
    </span>
  );
};
