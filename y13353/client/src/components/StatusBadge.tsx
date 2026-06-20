import React from 'react';
import { statusTextMap, delayStatusTextMap } from '../types';

interface StatusBadgeProps {
  status: string;
  type?: 'task' | 'delay';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'task' }) => {
  const text = type === 'task' ? statusTextMap[status] || status : delayStatusTextMap[status] || status;
  return (
    <span className={`status-badge status-${status}`}>
      {text}
    </span>
  );
};

export default StatusBadge;
