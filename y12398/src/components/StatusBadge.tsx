import React from 'react';
import {
  getStatusText,
  getStatusColor,
  getRecordStatusText,
  getRecordStatusColor,
  getAnomalyTypeText,
  getAnomalyTypeColor,
  getSeverityText,
  getSeverityColor,
  getEvidenceTypeText
} from '../utils/format';
import type { DeviceStatus, RecordStatus, AnomalyType, AnomalySeverity, EvidenceType } from '../../shared/types';

interface StatusBadgeProps {
  type: 'device' | 'record' | 'anomaly' | 'severity' | 'evidence';
  value: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value }) => {
  let text = value;
  let colorClass = 'bg-slate-100 text-slate-800';
  let dotColor = '';

  switch (type) {
    case 'device':
      text = getStatusText(value as DeviceStatus);
      colorClass = getStatusColor(value);
      break;
    case 'record':
      text = getRecordStatusText(value as RecordStatus);
      colorClass = getRecordStatusColor(value);
      break;
    case 'anomaly':
      text = getAnomalyTypeText(value as AnomalyType);
      colorClass = getAnomalyTypeColor(value);
      break;
    case 'severity':
      text = `${getSeverityText(value as AnomalySeverity)}风险`;
      dotColor = getSeverityColor(value);
      break;
    case 'evidence':
      text = getEvidenceTypeText(value as EvidenceType);
      colorClass = 'bg-primary-100 text-primary-800';
      break;
  }

  return (
    <span className={`badge ${colorClass} inline-flex items-center gap-1.5`}>
      {dotColor && <span className={`w-2 h-2 rounded-full ${dotColor}`} />}
      {text}
    </span>
  );
};
