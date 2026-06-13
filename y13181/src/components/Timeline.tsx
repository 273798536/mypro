import React from 'react';
import { cn } from '@/lib/utils';
import { Circle, CheckCircle, AlertCircle, Clock, FileText, Edit3 } from 'lucide-react';

export type TimelineActionType = 'create' | 'update' | 'judge' | 'mark' | 'note' | 'system';

interface TimelineItem {
  id: string;
  action: string;
  actionType: TimelineActionType;
  operator: string;
  remark: string;
  timestamp: string;
}

interface TimelineProps {
  items: TimelineItem[];
  className?: string;
}

const actionIconMap: Record<TimelineActionType, React.ReactNode> = {
  create: <FileText className="w-4 h-4" />,
  update: <Edit3 className="w-4 h-4" />,
  judge: <CheckCircle className="w-4 h-4" />,
  mark: <AlertCircle className="w-4 h-4" />,
  note: <FileText className="w-4 h-4" />,
  system: <Clock className="w-4 h-4" />,
};

const actionColorMap: Record<TimelineActionType, string> = {
  create: 'text-teal-glow bg-teal-glow/20',
  update: 'text-blue-400 bg-blue-400/20',
  judge: 'text-purple-400 bg-purple-400/20',
  mark: 'text-amber-warn bg-amber-warn/20',
  note: 'text-gray-400 bg-gray-400/20',
  system: 'text-gray-500 bg-gray-500/20',
};

function detectActionType(action: string): TimelineActionType {
  if (action.includes('入库') || action.includes('创建')) return 'create';
  if (action.includes('改判')) return 'judge';
  if (action.includes('标记')) return 'mark';
  if (action.includes('备注')) return 'note';
  if (action.includes('系统')) return 'system';
  return 'update';
}

export const Timeline: React.FC<TimelineProps> = ({ items, className }) => {
  return (
    <div className={cn('space-y-1', className)}>
      {items.map((item, index) => {
        const actionType = detectActionType(item.action);
        const icon = actionIconMap[actionType];
        const colorClass = actionColorMap[actionType];
        const isLast = index === items.length - 1;
        
        return (
          <div key={item.id} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
                {icon}
              </div>
              {!isLast && <div className="w-px flex-1 bg-white/10 mt-1" />}
            </div>
            <div className={cn('flex-1 pb-4', isLast && 'pb-0')}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-sm font-medium text-gray-200">{item.action}</span>
                <span className="text-xs text-gray-500">· {item.operator}</span>
              </div>
              <p className="text-xs text-gray-400 mb-1">{item.remark}</p>
              <span className="text-[11px] text-gray-500 font-mono">{item.timestamp}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

interface ProcessTimelineProps {
  records: { id: string; action: string; operator: string; remark: string; timestamp: string }[];
  className?: string;
}

export const ProcessTimeline: React.FC<ProcessTimelineProps> = ({ records, className }) => {
  const timelineItems: TimelineItem[] = records.map((r) => ({
    ...r,
    actionType: detectActionType(r.action),
  }));
  
  return <Timeline items={timelineItems} className={className} />;
};
