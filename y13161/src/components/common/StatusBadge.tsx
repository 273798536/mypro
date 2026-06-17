import React from 'react';
import { getAnomalyTypeLabel, getAnomalySeverityLabel, getAnomalyStatusLabel } from '@/utils/anomaly';
import type { AnomalyType, AnomalySeverity, AnomalyStatus } from '@/types';

export const AnomalyTypeBadge: React.FC<{ type: AnomalyType; className?: string }> = ({
  type,
  className = '',
}) => {
  const colors: { [key in AnomalyType]: string } = {
    unit_mismatch: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    direction_reversal: 'bg-alert-orange/20 text-alert-orange border-alert-orange/30',
    threshold: 'bg-alert-red/20 text-alert-red border-alert-red/30',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-1 text-xs font-medium rounded border ${colors[type]} ${className}`}
    >
      {getAnomalyTypeLabel(type)}
    </span>
  );
};

export const SeverityBadge: React.FC<{ severity: AnomalySeverity; className?: string }> = ({
  severity,
  className = '',
}) => {
  const colors: { [key in AnomalySeverity]: string } = {
    info: 'label-info',
    warning: 'label-warning',
    critical: 'label-critical',
  };

  return (
    <span className={`label ${colors[severity]} ${className}`}>
      {getAnomalySeverityLabel(severity)}
    </span>
  );
};

export const StatusBadge: React.FC<{ status: AnomalyStatus; className?: string }> = ({
  status,
  className = '',
}) => {
  const colors: { [key in AnomalyStatus]: string } = {
    pending: 'label-pending',
    confirmed: 'label-success',
    dismissed: 'bg-deep-sea-500/50 text-deep-sea-300 border border-deep-sea-400',
  };

  return (
    <span className={`label ${colors[status]} ${className}`}>
      {getAnomalyStatusLabel(status)}
    </span>
  );
};
