import { useState } from 'react';
import { ChevronDown, ChevronRight, Eye, Upload, RefreshCw, FileCheck, Settings, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TimelineEvent, TimelineEventType } from '@/types';

const eventIcons: Record<TimelineEventType, typeof Eye> = {
  status_change: FileCheck,
  material_upload: Upload,
  view_saved: Eye,
  rule_changed: Settings,
  task_created: Layers,
  task_rerun: RefreshCw,
};

const eventColors: Record<TimelineEventType, string> = {
  status_change: 'from-success-500 to-primary-500',
  material_upload: 'from-warning to-danger',
  view_saved: 'from-primary-400 to-primary-600',
  rule_changed: 'from-primary-300 to-primary-500',
  task_created: 'from-primary-400 to-primary-600',
  task_rerun: 'from-warning to-primary-500',
};

const eventDotColors: Record<TimelineEventType, string> = {
  status_change: 'bg-success-500',
  material_upload: 'bg-warning',
  view_saved: 'bg-primary-400',
  rule_changed: 'bg-primary-300',
  task_created: 'bg-primary-500',
  task_rerun: 'bg-warning',
};

interface TimelineNodeProps {
  event: TimelineEvent;
  isLast: boolean;
  defaultExpanded?: boolean;
}

export default function TimelineNode({ event, isLast, defaultExpanded = false }: TimelineNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = eventIcons[event.type];

  const hasSnapshot = Object.keys(event.snapshot).length > 0;

  return (
    <div className="relative pl-10 pb-8">
      {!isLast && (
        <div
          className={cn(
            'absolute left-[17px] top-7 bottom-0 w-px',
            'bg-gradient-to-b',
            eventColors[event.type],
            'opacity-30',
          )}
        />
      )}

      <div
        className={cn(
          'absolute left-0 top-1 w-9 h-9 rounded-full',
          'bg-gradient-to-br',
          eventColors[event.type],
          'flex items-center justify-center shadow-lg',
        )}
        style={{ boxShadow: '0 0 0 4px rgba(15, 52, 96, 0.8)' }}
      >
        <Icon size={16} className="text-white" />
      </div>

      <div className="relative">
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full text-left group"
        >
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-1">
                <p className="text-sm text-primary-100 font-medium group-hover:text-white transition">
                  {event.description}
                </p>
                {hasSnapshot && (
                  expanded
                    ? <ChevronDown size={14} className="text-primary-400 shrink-0 mt-0.5" />
                    : <ChevronRight size={14} className="text-primary-400 shrink-0 mt-0.5" />
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-primary-400/80">
                <span className={cn('w-2 h-2 rounded-full', eventDotColors[event.type])} />
                <span>{event.timestamp}</span>
                <span>·</span>
                <span>{event.operator}</span>
                {event.anomalyName && (
                  <>
                    <span>·</span>
                    <span className="text-primary-300">关联: {event.anomalyName}</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </button>

        {expanded && hasSnapshot && (
          <div className="mt-3 p-4 rounded-lg bg-dark-900/60 border border-primary-700/30 backdrop-blur-sm">
            <p className="text-[11px] uppercase tracking-wider text-primary-400/70 mb-2">快照数据 Snapshot</p>
            <div className="space-y-1.5">
              {Object.entries(event.snapshot).map(([key, val]) => (
                <div key={key} className="flex items-start gap-3 text-xs">
                  <span className="text-primary-400/60 w-24 shrink-0">{key}:</span>
                  <span className="text-primary-100 font-mono break-all">
                    {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
