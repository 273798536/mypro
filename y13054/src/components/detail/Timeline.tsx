import { Clock, User } from 'lucide-react';
import TimelineDot, { TYPE_META } from './TimelineDot';
import type { TimelineEvent } from '@/types';

interface Props {
  events: TimelineEvent[];
}

export default function Timeline({ events }: Props) {
  if (events.length === 0) {
    return (
      <div className="py-8 text-center text-gray-400 text-sm">暂无时间线记录</div>
    );
  }

  return (
    <div className="relative pl-1">
      {events.map((ev, idx) => {
        const meta = TYPE_META[ev.type];
        const isLast = idx === events.length - 1;
        return (
          <div key={ev.id} className="relative pl-8 pb-6">
            {!isLast && <div className="timeline-line" />}
            <div className="absolute left-0 top-1">
              <TimelineDot type={ev.type} />
            </div>
            <div className="bg-white border border-gray-200 rounded-sm p-3 shadow-sm hover:shadow transition-shadow">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-sm ${meta.color}`}
                    style={{ backgroundColor: `${meta.bg}15` }}
                  >
                    {meta.label}
                  </span>
                  <span className="font-mono-data text-xs text-gray-400">{ev.id}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" strokeWidth={1.8} />
                    {ev.operator}
                  </span>
                  <span className="flex items-center gap-1 font-mono-data">
                    <Clock className="w-3 h-3" strokeWidth={1.8} />
                    {ev.timestamp}
                  </span>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-700 leading-relaxed">{ev.description}</p>
              {ev.metadata && Object.keys(ev.metadata).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-100 text-xs font-mono-data text-gray-500 space-y-0.5">
                  {Object.entries(ev.metadata).map(([k, v]) => (
                    <div key={k}>
                      <span className="text-gray-400">{k}:</span>{' '}
                      <span className="text-gray-700">
                        {typeof v === 'object' ? JSON.stringify(v) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
