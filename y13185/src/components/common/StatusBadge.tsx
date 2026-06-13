import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle, AlertTriangle, Clock, Pause, Info } from 'lucide-react';

interface StatusBadgeProps {
  status: 'success' | 'error' | 'warning' | 'pending' | 'suspended' | 'info' | 'processing';
  children: ReactNode;
  className?: string;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

const statusConfig = {
  success: {
    bg: 'bg-green-50',
    text: 'text-green-700',
    border: 'border-green-200',
    icon: CheckCircle2,
    iconColor: 'text-green-500',
  },
  error: {
    bg: 'bg-red-50',
    text: 'text-red-700',
    border: 'border-red-200',
    icon: XCircle,
    iconColor: 'text-red-500',
  },
  processing: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock,
    iconColor: 'text-blue-500',
  },
  warning: {
    bg: 'bg-amber-50',
    text: 'text-amber-700',
    border: 'border-amber-200',
    icon: AlertTriangle,
    iconColor: 'text-amber-500',
  },
  pending: {
    bg: 'bg-blue-50',
    text: 'text-blue-700',
    border: 'border-blue-200',
    icon: Clock,
    iconColor: 'text-blue-500',
  },
  suspended: {
    bg: 'bg-[#E94560]/10',
    text: 'text-[#E94560]',
    border: 'border-[#E94560]/30',
    icon: Pause,
    iconColor: 'text-[#E94560]',
  },
  info: {
    bg: 'bg-gray-50',
    text: 'text-gray-700',
    border: 'border-gray-200',
    icon: Info,
    iconColor: 'text-gray-500',
  },
};

export const StatusBadge = ({
  status,
  children,
  className,
  showIcon = true,
  size = 'md',
}: StatusBadgeProps) => {
  const config = statusConfig[status];
  const Icon = config.icon;
  
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';
  
  return (
    <span className={cn(
      'inline-flex items-center gap-1.5 font-medium rounded-full border',
      config.bg,
      config.text,
      config.border,
      sizeClasses,
      className
    )}>
      {showIcon && <Icon className={cn('w-3.5 h-3.5', config.iconColor)} />}
      {children}
    </span>
  );
};

interface ResultStatusBadgeProps {
  status: 'normal' | 'suspended' | 'confirmed' | 'rejected' | 'pending';
  className?: string;
  size?: 'sm' | 'md';
}

export const ResultStatusBadge = ({ status, className, size }: ResultStatusBadgeProps) => {
  const statusMap: Record<string, { status: StatusBadgeProps['status']; label: string }> = {
    normal: { status: 'success', label: '正常' },
    suspended: { status: 'suspended', label: '已挂起' },
    confirmed: { status: 'success', label: '已确认' },
    rejected: { status: 'error', label: '已拒绝' },
    pending: { status: 'warning', label: '待计算' },
  };
  
  const { status: badgeStatus, label } = statusMap[status];
  
  return (
    <StatusBadge status={badgeStatus} className={className} size={size}>
      {label}
    </StatusBadge>
  );
};
