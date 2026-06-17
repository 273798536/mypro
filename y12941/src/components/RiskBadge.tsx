import React from 'react';
import { RISK_LEVEL_LABELS } from '../../shared/types';
import type { RiskLevel } from '../../shared/types';

interface RiskBadgeProps {
  level: RiskLevel;
}

export const RiskBadge: React.FC<RiskBadgeProps> = ({ level }) => {
  const styles: Record<RiskLevel, string> = {
    high: 'bg-red-100 text-red-700 border-red-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    low: 'bg-green-100 text-green-700 border-green-200',
    none: 'bg-gray-100 text-gray-600 border-gray-200'
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${styles[level]}`}>
      <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
        level === 'high' ? 'bg-red-500' :
        level === 'medium' ? 'bg-amber-500' :
        level === 'low' ? 'bg-green-500' : 'bg-gray-400'
      }`}></span>
      {RISK_LEVEL_LABELS[level]}
    </span>
  );
};
