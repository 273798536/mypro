import { AlertTriangle, CheckCircle, XCircle, Clock } from 'lucide-react';
import type { DeviceStatus as DeviceStatusType } from '../types';

interface StatusBadgeProps {
  status: DeviceStatusType['status'];
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  const statusConfig = {
    running: {
      bg: 'bg-emerald-100',
      text: 'text-emerald-700',
      icon: CheckCircle,
      label: '运行中',
    },
    stopped: {
      bg: 'bg-red-100',
      text: 'text-red-700',
      icon: XCircle,
      label: '已停机',
    },
    maintenance: {
      bg: 'bg-amber-100',
      text: 'text-amber-700',
      icon: Clock,
      label: '检修中',
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 rounded-full ${config.bg} ${config.text} ${sizeClasses} font-medium`}>
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-4 h-4'} />
      {config.label}
    </span>
  );
}

interface AlertBadgeProps {
  type: 'warning' | 'error' | 'info';
  children: React.ReactNode;
}

export function AlertBadge({ type, children }: AlertBadgeProps) {
  const config = {
    warning: {
      bg: 'bg-amber-50 border-amber-300',
      text: 'text-amber-800',
      icon: AlertTriangle,
    },
    error: {
      bg: 'bg-red-50 border-red-300',
      text: 'text-red-800',
      icon: XCircle,
    },
    info: {
      bg: 'bg-blue-50 border-blue-300',
      text: 'text-blue-800',
      icon: AlertTriangle,
    },
  };

  const { bg, text, icon: Icon } = config[type];

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${bg} ${text}`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm font-medium">{children}</span>
    </div>
  );
}
