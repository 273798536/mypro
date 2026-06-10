import { batchStatusMap, resultStatusMap } from '../../../shared/utils/consistency';
import type { BatchStatus, ResultStatus } from '../../../shared/types';

interface StatusBadgeProps {
  status: BatchStatus | ResultStatus;
  type?: 'batch' | 'result';
}

export function StatusBadge({ status, type = 'batch' }: StatusBadgeProps) {
  const map = type === 'batch' ? batchStatusMap : resultStatusMap;
  const config = map[status as keyof typeof map];

  if (!config) {
    return <span className="px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">{status}</span>;
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border ${config.bgColor} ${config.color} ${config.borderColor}`}
    >
      {config.label}
    </span>
  );
}
