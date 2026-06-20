import React from 'react';
import type { TimelineEvent } from '@/types';
import { TimelineNode } from './TimelineNode';

interface Props {
  events: TimelineEvent[];
  onSelect?: (e: TimelineEvent) => void;
}

export const TimelineAxis: React.FC<Props> = ({ events, onSelect }) => {
  if (events.length === 0) {
    return (
      <div className="py-24 text-center text-muted text-sm">
        当前筛选条件下暂无时间线记录
      </div>
    );
  }

  return (
    <div className="relative py-4">
      <div className="absolute left-1/2 top-0 bottom-0 w-[2px] -translate-x-1/2 bg-gradient-to-b from-transparent via-amber/30 to-transparent" />
      <div className="space-y-8">
        {events.map((event, idx) => (
          <TimelineNode
            key={event.id}
            event={event}
            index={idx}
            side={idx % 2 === 0 ? 'left' : 'right'}
            onSelect={onSelect}
          />
        ))}
      </div>
      <div className="absolute left-1/2 -bottom-4 w-3 h-3 rounded-full bg-amber -translate-x-1/2 animate-pulse-amber" />
    </div>
  );
};
