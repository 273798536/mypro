import React from 'react';
import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'normal' | 'warning' | 'critical' | 'pending' | 'approved' | 'rejected';
  children: React.ReactNode;
  className?: string;
}

const statusStyles = {
  normal: 'bg-green-500/20 text-green-400 border-green-500/30',
  warning: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  critical: 'bg-red-500/20 text-red-400 border-red-500/30',
  pending: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
  approved: 'bg-green-500/20 text-green-400 border-green-500/30',
  rejected: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, children, className }) => {
  return (
    <span className={cn(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border',
      statusStyles[status],
      className
    )}>
      {children}
    </span>
  );
};

export default StatusBadge;
