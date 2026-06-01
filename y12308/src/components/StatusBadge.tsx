import React from 'react';
import { Circle, AlertTriangle, Square, Triangle, Sparkles, RefreshCw } from 'lucide-react';
import { MemberStatus } from '../types';
import { cn } from '../lib/utils';

interface StatusBadgeProps {
  status: MemberStatus;
  size?: 'sm' | 'md' | 'lg';
}

const statusConfig = {
  [MemberStatus.active]: {
    color: '#10B981',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    textColor: 'text-emerald-700',
    icon: Circle,
    label: '活跃',
  },
  [MemberStatus.at_risk]: {
    color: '#F59E0B',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-700',
    icon: AlertTriangle,
    label: '高危',
  },
  [MemberStatus.silent]: {
    color: '#64748B',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-700',
    icon: Square,
    label: '沉默',
  },
  [MemberStatus.churned]: {
    color: '#EF4444',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    textColor: 'text-red-700',
    icon: Triangle,
    label: '流失',
  },
  [MemberStatus.new]: {
    color: '#3B82F6',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-700',
    icon: Sparkles,
    label: '新会员',
  },
  [MemberStatus.reactivated]: {
    color: '#8B5CF6',
    bgColor: 'bg-violet-50',
    borderColor: 'border-violet-200',
    textColor: 'text-violet-700',
    icon: RefreshCw,
    label: '回流',
  },
};

const sizeConfig = {
  sm: {
    padding: 'px-2 py-0.5',
    fontSize: 'text-xs',
    iconSize: 12,
  },
  md: {
    padding: 'px-2.5 py-1',
    fontSize: 'text-sm',
    iconSize: 14,
  },
  lg: {
    padding: 'px-3 py-1.5',
    fontSize: 'text-base',
    iconSize: 16,
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border font-medium',
        config.bgColor,
        config.borderColor,
        config.textColor,
        sizeStyles.padding,
        sizeStyles.fontSize
      )}
    >
      <Icon size={sizeStyles.iconSize} fill={config.color} style={{ color: config.color }} />
      {config.label}
    </span>
  );
};

export default StatusBadge;
