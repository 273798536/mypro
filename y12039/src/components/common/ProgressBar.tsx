import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
  color?: 'cyan' | 'green' | 'red' | 'orange' | 'yellow';
  showValue?: boolean;
  label?: string;
  height?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  max,
  color = 'cyan',
  showValue = false,
  label,
  height = 'md'
}) => {
  const percentage = Math.max(0, Math.min(100, (value / max) * 100));
  
  const colors = {
    cyan: 'bg-cyber-cyan text-cyber-cyan',
    green: 'bg-success-green text-success-green',
    red: 'bg-alert-red text-alert-red',
    orange: 'bg-warning-orange text-warning-orange',
    yellow: 'bg-yellow-400 text-yellow-400'
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  };

  const isLow = percentage <= 20;
  const isMedium = percentage > 20 && percentage <= 40;
  const barColor = isLow ? 'red' : isMedium ? 'orange' : color;

  return (
    <div className="w-full">
      {(label || showValue) && (
        <div className="flex justify-between text-xs mb-1">
          {label && <span className="text-gray-400">{label}</span>}
          {showValue && <span className={colors[barColor].split(' ')[1]}>{value.toFixed(0)}/{max}</span>}
        </div>
      )}
      <div className={`w-full bg-gray-700/50 rounded-full overflow-hidden ${heights[height]}`}>
        <div
          className={`h-full rounded-full transition-all duration-300 ${colors[barColor].split(' ')[0]} ${
            isLow ? 'progress-bar-glow animate-pulse' : ''
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};
