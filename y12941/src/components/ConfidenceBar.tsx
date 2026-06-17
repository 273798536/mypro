import React from 'react';

interface ConfidenceBarProps {
  value: number;
  showLabel?: boolean;
}

export const ConfidenceBar: React.FC<ConfidenceBarProps> = ({ value, showLabel = true }) => {
  const percentage = Math.round(value * 100);
  const colorClass = percentage >= 80 ? 'bg-green-500' : percentage >= 50 ? 'bg-amber-500' : 'bg-red-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[80px]">
        <div
          className={`h-full ${colorClass} transition-all duration-300`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-600 font-medium min-w-[36px]">
          {percentage}%
        </span>
      )}
    </div>
  );
};
