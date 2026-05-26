import React from 'react';
import type { AccountStatus } from '../types';
import { getRiskColor } from '../utils/riskAssessor';
import { GAME_CONFIG } from '../constants/gameConfig';

interface MarginBarProps {
  riskLevel: number;
  status: AccountStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const MarginBar: React.FC<MarginBarProps> = ({
  riskLevel,
  status,
  showLabel = true,
  size = 'md',
}) => {
  const clampedRisk = Math.min(riskLevel, 150);
  const percentage = (clampedRisk / 150) * 100;
  const riskColor = getRiskColor(status);

  const heightClass = size === 'sm' ? 'h-2' : size === 'lg' ? 'h-6' : 'h-4';
  const textSize = size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-lg' : 'text-sm';

  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className={`${textSize} font-medium text-gray-700`}>风险度</span>
          <span className={`${textSize} font-mono font-bold ${
            status === 'danger' ? 'text-risk-danger animate-pulse' :
            status === 'warning' ? 'text-risk-warning' :
            'text-risk-safe'
          }`}>
            {riskLevel.toFixed(1)}%
          </span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${heightClass} overflow-hidden relative`}>
        <div
          className={`h-full ${riskColor} transition-all duration-500 ease-out rounded-full`}
          style={{ width: `${percentage}%` }}
        />
        <div className="absolute top-0 left-0 h-full w-full flex items-center pointer-events-none">
          <div
            className="h-full w-0.5 bg-yellow-500 opacity-70"
            style={{ left: `${(GAME_CONFIG.WARNING_THRESHOLD / 150) * 100}%` }}
          />
          <div
            className="h-full w-0.5 bg-red-600 opacity-70"
            style={{ left: `${(GAME_CONFIG.DANGER_THRESHOLD / 150) * 100}%` }}
          />
        </div>
      </div>
      {size !== 'sm' && (
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>安全</span>
          <span className="text-yellow-600">预警</span>
          <span className="text-red-600">危险</span>
        </div>
      )}
    </div>
  );
};
