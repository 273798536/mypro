import React from 'react';
import { CheckCircle, AlertTriangle, XCircle, Ban } from 'lucide-react';
import type { SampleStatus, QCStatus } from '@/types';
import { SAMPLE_STATUS_LABELS, QC_STATUS_LABELS } from '@/types';

interface StatusBadgeProps {
  status: SampleStatus | QCStatus;
  type?: 'sample' | 'qc';
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  type = 'sample',
  size = 'md',
  showLabel = true
}) => {
  const config = {
    sample: {
      success: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-500',
        text: 'text-emerald-700',
        icon: CheckCircle,
        iconColor: 'text-emerald-500'
      },
      pending: {
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        text: 'text-amber-700',
        icon: AlertTriangle,
        iconColor: 'text-amber-500'
      },
      bad: {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-700',
        icon: XCircle,
        iconColor: 'text-red-500'
      },
      blocked: {
        bg: 'bg-rose-50',
        border: 'border-rose-500',
        text: 'text-rose-700',
        icon: Ban,
        iconColor: 'text-rose-500'
      }
    },
    qc: {
      pass: {
        bg: 'bg-emerald-50',
        border: 'border-emerald-500',
        text: 'text-emerald-700',
        icon: CheckCircle,
        iconColor: 'text-emerald-500'
      },
      warning: {
        bg: 'bg-amber-50',
        border: 'border-amber-500',
        text: 'text-amber-700',
        icon: AlertTriangle,
        iconColor: 'text-amber-500'
      },
      fail: {
        bg: 'bg-red-50',
        border: 'border-red-500',
        text: 'text-red-700',
        icon: XCircle,
        iconColor: 'text-red-500'
      }
    }
  };

  const styleConfig = config[type][status];
  const label = type === 'sample'
    ? SAMPLE_STATUS_LABELS[status as SampleStatus]
    : QC_STATUS_LABELS[status as QCStatus];

  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base'
  };

  const iconSizes = {
    sm: 14,
    md: 16,
    lg: 20
  };

  const Icon = styleConfig.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border-2 ${styleConfig.bg} ${styleConfig.border} ${styleConfig.text} ${sizeClasses[size]} font-medium transition-all`}
    >
      <Icon size={iconSizes[size]} className={styleConfig.iconColor} />
      {showLabel && <span>{label}</span>}
    </span>
  );
};

export default StatusBadge;
