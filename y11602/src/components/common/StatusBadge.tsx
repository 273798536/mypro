import type { LoanStatus } from '../../types';
import { getStatusLabel, getStatusClass } from '../../utils/statusMachine';

interface StatusBadgeProps {
  status: LoanStatus;
}

export default function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge ${getStatusClass(status)}`}>
      {getStatusLabel(status)}
    </span>
  );
}
