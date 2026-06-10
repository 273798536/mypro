import { ClipboardList, Calculator, SearchCheck, FileDown, User } from 'lucide-react';
import type { TimelineEvent, TimelineEventType } from '@/types';

interface BatchTimelineProps {
  events: TimelineEvent[];
}

const iconMap: Record<TimelineEventType, typeof ClipboardList> = {
  '录入': ClipboardList,
  '计算': Calculator,
  '复核': SearchCheck,
  '导出': FileDown,
};

const colorMap: Record<TimelineEventType, string> = {
  '录入': 'bg-lab-navy',
  '计算': 'bg-lab-green',
  '复核': 'bg-lab-amber',
  '导出': 'bg-gray-500',
};

export function BatchTimeline({ events }: BatchTimelineProps) {
  const sorted = [...events].sort((a, b) => a.timestamp.localeCompare(b.timestamp));

  return (
    <div className="lab-card p-5">
      <h3 className="font-serif text-lg font-semibold text-lab-navy mb-6">批次处理时间线</h3>

      {sorted.length === 0 ? (
        <p className="text-gray-400 text-center py-8">暂无时间线记录</p>
      ) : (
        <div className="relative pl-8 border-l-2 border-lab-line ml-2">
          {sorted.map((event, index) => {
            const Icon = iconMap[event.type];
            const bgColor = colorMap[event.type];

            return (
              <div
                key={event.id}
                className="relative mb-6 last:mb-0"
                style={{ animation: `fadeIn 0.5s ease-out ${index * 0.1}s both` }}
              >
                <div className={`absolute -left-[42px] top-0 w-8 h-8 ${bgColor} rounded-full flex items-center justify-center border-4 border-lab-paper`}>
                  <Icon size={16} className="text-white" />
                </div>

                <div className="bg-white border border-lab-line rounded-sm p-4 ml-2">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-lab-ink">{event.description}</h4>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <User size={12} /> {event.operator}
                        </span>
                        <span>{event.timestamp}</span>
                      </div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-sm text-white ${bgColor}`}>
                      {event.type}
                    </span>
                  </div>

                  {event.sourceRef && (
                    <div className="mt-2 pt-2 border-t border-lab-line/50">
                      <span className="source-badge">
                        📌 来源：{event.sourceRef}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
