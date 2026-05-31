import type { CalculationStatus, ExceptionStatus, ExceptionSeverity, ExceptionType, SeriesStatus } from '@/types';
import { CALCULATION_STATUS_LABELS, EXCEPTION_STATUS_LABELS, EXCEPTION_SEVERITY_LABELS, EXCEPTION_TYPE_LABELS, SERIES_STATUS_LABELS } from '@/types';

interface Props {
  status: CalculationStatus | ExceptionStatus | ExceptionSeverity | ExceptionType | SeriesStatus;
  type?: 'calculation' | 'exception-status' | 'exception-severity' | 'exception-type';
}

export default function StatusBadge({ status, type = 'calculation' }: Props) {
  let label: string = status;
  let className = 'status-normal';
  
  if (type === 'calculation') {
    if (Object.keys(CALCULATION_STATUS_LABELS).includes(status as string)) {
      label = CALCULATION_STATUS_LABELS[status as CalculationStatus];
      const statusClassMap: Record<CalculationStatus, string> = {
        normal: 'status-normal',
        exception: 'status-exception',
        pending: 'status-pending',
        outdated: 'status-outdated',
      };
      className = statusClassMap[status as CalculationStatus] || className;
    } else if (Object.keys(SERIES_STATUS_LABELS).includes(status as string)) {
      label = SERIES_STATUS_LABELS[status as SeriesStatus];
      const statusClassMap: Record<SeriesStatus, string> = {
        active: 'status-normal',
        completed: 'status-outdated',
        pending: 'status-pending',
      };
      className = statusClassMap[status as SeriesStatus] || className;
    }
  } else if (type === 'exception-status') {
    label = EXCEPTION_STATUS_LABELS[status as ExceptionStatus] || status;
    const statusClassMap: Record<ExceptionStatus, string> = {
      open: 'status-exception',
      processing: 'status-pending',
      resolved: 'status-normal',
    };
    className = statusClassMap[status as ExceptionStatus] || className;
  } else if (type === 'exception-severity') {
    label = EXCEPTION_SEVERITY_LABELS[status as ExceptionSeverity] || status;
    const severityClassMap: Record<ExceptionSeverity, string> = {
      high: 'status-exception',
      medium: 'badge bg-amber-50 text-amber-700 border border-amber-200',
      low: 'status-pending',
    };
    className = severityClassMap[status as ExceptionSeverity] || className;
  } else if (type === 'exception-type') {
    label = EXCEPTION_TYPE_LABELS[status as ExceptionType] || status;
    const typeClassMap: Record<ExceptionType, string> = {
      cost_delay: 'badge bg-red-50 text-red-700 border border-red-200',
      payment_split: 'badge bg-purple-50 text-purple-700 border border-purple-200',
      account_mismatch: 'badge bg-orange-50 text-orange-700 border border-orange-200',
      data_missing: 'badge bg-gray-100 text-gray-700 border border-gray-200',
    };
    className = typeClassMap[status as ExceptionType] || className;
  }
  
  return (
    <span className={`badge ${className}`}>
      {label}
    </span>
  );
}