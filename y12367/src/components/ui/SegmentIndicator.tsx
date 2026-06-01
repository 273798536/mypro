import * as React from 'react';
import { cn } from '@/lib/utils';
import type { WorkingConditionSegment } from '@/types';

interface SegmentIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
  segments: WorkingConditionSegment[];
  activeSegmentId?: string;
  onSegmentClick?: (segmentId: string) => void;
  showValues?: boolean;
}

export const SegmentIndicator: React.FC<SegmentIndicatorProps> = ({
  segments,
  activeSegmentId,
  onSegmentClick,
  showValues = true,
  className,
}) => {
  const sortedSegments = [...segments].sort((a, b) => a.order - b.order);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {sortedSegments.map((segment, index) => (
        <React.Fragment key={segment.id}>
          <button
            onClick={() => onSegmentClick?.(segment.id)}
            className={cn(
              'flex flex-col items-center px-3 py-2 rounded transition-all duration-200',
              activeSegmentId === segment.id
                ? 'bg-industrial-bg-light border border-industrial-border-light'
                : 'hover:bg-industrial-bg-light/50',
              onSegmentClick && 'cursor-pointer'
            )}
          >
            <div
              className="w-3 h-3 rounded-full mb-1"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-xs font-medium text-industrial-text">{segment.name}</span>
            {showValues && (
              <span className="text-xs text-industrial-text-muted font-mono">
                {segment.speedRange[0]}-{segment.speedRange[1]} rpm
              </span>
            )}
          </button>
          {index < sortedSegments.length - 1 && (
            <div className="w-8 h-px bg-industrial-border" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

interface SegmentLegendProps extends React.HTMLAttributes<HTMLDivElement> {
  segments: WorkingConditionSegment[];
  vertical?: boolean;
}

export const SegmentLegend: React.FC<SegmentLegendProps> = ({
  segments,
  vertical = false,
  className,
}) => {
  const sortedSegments = [...segments].sort((a, b) => a.order - b.order);

  return (
    <div className={cn(
      'flex gap-4',
      vertical ? 'flex-col' : 'flex-row flex-wrap',
      className
    )}>
      {sortedSegments.map((segment) => (
        <div key={segment.id} className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: segment.color }}
          />
          <span className="text-xs text-industrial-text-muted">{segment.name}</span>
        </div>
      ))}
    </div>
  );
};
