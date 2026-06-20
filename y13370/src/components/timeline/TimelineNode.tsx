import React from 'react';
import {
  Database, Tag, SlidersHorizontal, UserPen, BarChart3, AlertTriangle, Puzzle
} from 'lucide-react';
import type { TimelineEvent, EventType } from '@/types';
import { ConsistencyBadge } from './ConsistencyBadge';
import { formatShortTime } from '@/utils/time';

const eventStyles: Record<EventType, { icon: React.ElementType; color: string; bg: string; border: string; label: string }> = {
  sample: { icon: Database, color: 'text-info', bg: 'bg-info/15', border: 'border-info/40', label: '样本' },
  version: { icon: Tag, color: 'text-[#a855f7]', bg: 'bg-[#a855f7]/15', border: 'border-[#a855f7]/40', label: '版本' },
  threshold: { icon: SlidersHorizontal, color: 'text-[#ec4899]', bg: 'bg-[#ec4899]/15', border: 'border-[#ec4899]/40', label: '阈值' },
  correction: { icon: UserPen, color: 'text-amber', bg: 'bg-amber/15', border: 'border-amber/40', label: '人工修正' },
  metric: { icon: BarChart3, color: 'text-emerald', bg: 'bg-emerald/15', border: 'border-emerald/40', label: '指标' },
  failure: { icon: AlertTriangle, color: 'text-danger', bg: 'bg-danger/15', border: 'border-danger/40', label: '失败/备注' },
  feature: { icon: Puzzle, color: 'text-[#f97316]', bg: 'bg-[#f97316]/15', border: 'border-[#f97316]/40', label: '特征' }
};

interface Props {
  event: TimelineEvent;
  index: number;
  side: 'left' | 'right';
  onSelect?: (e: TimelineEvent) => void;
}

export const TimelineNode: React.FC<Props> = ({ event, index, side, onSelect }) => {
  const style = eventStyles[event.eventType];
  const Icon = style.icon;

  return (
    <div
      className="relative grid grid-cols-2 gap-6 animate-stagger-in"
      style={{ animationDelay: `${Math.min(index * 40, 600)}ms` }}
    >
      <div className={`${side === 'left' ? 'text-right pr-6' : 'order-2 pl-6'}`}>
        <div
          className={`inline-block text-left max-w-full cursor-pointer group rounded-xl p-4 border ${style.border} ${style.bg} hover:brightness-125 transition-all duration-200 ease-out hover:-translate-y-0.5`}
          onClick={() => onSelect?.(event)}
        >
          <div className="flex items-center gap-2 mb-1.5">
            <span className={`chip !py-0.5 !px-2 ${style.color}`} style={{ borderColor: 'currentColor', opacity: 0.6 }}>
              {style.label}
            </span>
            <span className="text-[10px] font-mono text-muted">{formatShortTime(event.eventTime)}</span>
          </div>
          <div className="text-[13px] font-semibold text-primary mb-1">{event.title}</div>
          <div className="text-[11px] text-secondary leading-relaxed">{event.description}</div>
          <div className="mt-2 pt-2 border-t border-border-default flex items-center justify-between">
            <span className="text-[10px] font-mono text-muted">REF: {event.refId}</span>
            <ConsistencyBadge status={event.isConsistent} size="sm" />
          </div>
        </div>
      </div>

      <div className={`${side === 'left' ? '' : 'order-1'} relative flex items-center`}>
        <div className={`absolute top-1/2 ${side === 'left' ? '-left-[1px] translate-x-1/2' : '-right-[1px] -translate-x-1/2'} -translate-y-1/2`}>
          <div className={`relative w-10 h-10 rounded-full ${style.bg} border-2 ${style.border} flex items-center justify-center group-hover:scale-110 transition-transform duration-200 ease-out`}>
            <Icon className={`w-4 h-4 ${style.color}`} strokeWidth={2} />
            <div className={`absolute inset-0 rounded-full ${style.color} opacity-0 group-hover:opacity-20 transition-opacity animate-ping`} />
          </div>
        </div>
      </div>
    </div>
  );
};
