import React from 'react';
import { CheckCircle, Clock, Skull, MinusCircle } from 'lucide-react';
import { SampleStatus, STATUS_LABELS } from '../../shared/types';

interface StatusBadgeProps {
  status: SampleStatus;
  size?: 'sm' | 'md';
}

const statusConfig: Record<SampleStatus, { icon: React.ReactNode; className: string }> = {
  pending: {
    icon: <MinusCircle className="w-3.5 h-3.5" />,
    className: 'bg-slate-100 text-slate-700 border-slate-300',
  },
  normal: {
    icon: <CheckCircle className="w-3.5 h-3.5" />,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-300',
  },
  borderline: {
    icon: <Clock className="w-3.5 h-3.5" />,
    className: 'bg-amber-50 text-amber-700 border-amber-300',
  },
  contaminated: {
    icon: <Skull className="w-3.5 h-3.5" />,
    className: 'bg-rose-50 text-rose-700 border-rose-300',
  },
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const config = statusConfig[status];
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium border rounded-full ${sizeClass} ${config.className}`}
    >
      {config.icon}
      {STATUS_LABELS[status]}
    </span>
  );
};
