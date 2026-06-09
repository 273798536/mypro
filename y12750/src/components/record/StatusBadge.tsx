import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import type { RecordStatus } from '../../types';

const statusConfig: Record<RecordStatus, { label: string; bg: string; text: string; icon: typeof CheckCircle }> = {
  passed: {
    label: '已通过',
    bg: 'bg-lab-green/15',
    text: 'text-lab-green',
    icon: CheckCircle,
  },
  pending: {
    label: '待确认',
    bg: 'bg-lab-yellow/15',
    text: 'text-lab-yellow',
    icon: AlertTriangle,
  },
  error: {
    label: '异常',
    bg: 'bg-lab-red/15',
    text: 'text-lab-red',
    icon: XCircle,
  },
};

interface Props {
  status: RecordStatus;
  size?: 'sm' | 'md';
}

export default function StatusBadge({ status, size = 'md' }: Props) {
  const config = statusConfig[status];
  const Icon = config.icon;
  const sizeClass = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClass} ${config.bg} ${config.text} transition-transform hover:scale-105`}
    >
      <Icon size={size === 'sm' ? 12 : 14} />
      {config.label}
    </span>
  );
}
