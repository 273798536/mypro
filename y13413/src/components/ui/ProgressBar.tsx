import React from 'react';
import { cn } from '../../lib/utils';

export interface ProgressSegment {
  value: number;
  color: string;
  label?: string;
}

export interface ProgressBarProps {
  value: number;
  segments?: ProgressSegment[];
  showLabel?: boolean;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  segments,
  showLabel = false,
  className,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));

  if (segments && segments.length > 0) {
    const total = segments.reduce((sum, s) => sum + s.value, 0);
    return (
      <div className={cn('w-full', className)}>
        <div className="relative w-full h-3 bg-parchment-200 rounded-full overflow-hidden">
          {segments.map((segment, index) => {
            const width = total > 0 ? (segment.value / total) * 100 : 0;
            return (
              <div
                key={index}
                className="absolute top-0 h-full first:rounded-l-full last:rounded-r-full transition-all duration-300"
                style={{
                  left: `${segments.slice(0, index).reduce((sum, s) => sum + (s.value / total) * 100, 0)}%`,
                  width: `${width}%`,
                  backgroundColor: segment.color,
                }}
              />
            );
          })}
        </div>
        {showLabel && (
          <div className="flex flex-wrap gap-3 mt-2">
            {segments.map((segment, index) => (
              <div key={index} className="flex items-center gap-1.5 text-xs font-mono text-charcoal-600">
                <span
                  className="w-2.5 h-2.5 rounded-sm"
                  style={{ backgroundColor: segment.color }}
                />
                {segment.label && <span>{segment.label}:</span>}
                <span>{segment.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="relative w-full h-3 bg-parchment-200 rounded-full overflow-hidden">
        <div
          className="absolute top-0 left-0 h-full bg-ink-500 rounded-full transition-all duration-300"
          style={{ width: `${clampedValue}%` }}
        />
      </div>
      {showLabel && (
        <p className="mt-1 text-xs font-mono text-charcoal-500">
          {clampedValue}%
        </p>
      )}
    </div>
  );
};

export default ProgressBar;
