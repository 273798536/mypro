import type { CalculationStatus } from '../../types/doppler';

interface StatusBadgeProps {
  status: CalculationStatus;
  showLabel?: boolean;
}

const statusConfig: Record<CalculationStatus, { label: string; className: string }> = {
  incomplete: {
    label: '未完成',
    className: 'bg-gray-100 text-gray-700 border-gray-300'
  },
  normal: {
    label: '正常',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-300'
  },
  pending: {
    label: '待确认',
    className: 'bg-amber-50 text-amber-700 border-amber-300'
  },
  error: {
    label: '异常',
    className: 'bg-red-50 text-red-700 border-red-300'
  }
};

export function StatusBadge({ status, showLabel = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${config.className}`}
    >
      <span
        className={`w-2 h-2 rounded-full ${
          status === 'normal' ? 'bg-emerald-500' :
          status === 'pending' ? 'bg-amber-500' :
          status === 'error' ? 'bg-red-500' : 'bg-gray-400'
        }`}
      />
      {showLabel && config.label}
    </span>
  );
}
