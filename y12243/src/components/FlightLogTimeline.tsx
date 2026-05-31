import { useGameStore } from '@/store/gameStore';
import { Circle, Fuel, AlertTriangle, MessageSquare, Clock } from 'lucide-react';
import type { FlightLogEventType } from '@/types';

const eventConfig: Record<FlightLogEventType, { icon: React.ElementType; label: string; color: string; dotColor: string }> = {
  allocation: { icon: Circle, label: '分配', color: 'bg-blue-500/20 text-blue-400 border-blue-500/40', dotColor: 'bg-blue-400' },
  fuel_settlement: { icon: Fuel, label: '燃料结算', color: 'bg-orange-500/20 text-orange-400 border-orange-500/40', dotColor: 'bg-orange-400' },
  window_miss: { icon: AlertTriangle, label: '窗口错过', color: 'bg-red-500/20 text-red-400 border-red-500/40', dotColor: 'bg-red-400' },
  orbit_intersection: { icon: AlertTriangle, label: '轨道相交', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/40', dotColor: 'bg-yellow-400' },
  note: { icon: MessageSquare, label: '备注', color: 'bg-gray-500/20 text-gray-400 border-gray-500/40', dotColor: 'bg-gray-400' },
};

function formatTime(iso: string): string {
  const date = new Date(iso);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

export default function FlightLogTimeline() {
  const flightLogs = useGameStore(s => s.flightLogs);
  const sorted = [...flightLogs].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <div className="h-full flex flex-col rounded-xl border border-space-border bg-space-panel/80">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-space-border">
        <Clock className="w-4 h-4 text-star-blue" />
        <h2 className="text-sm font-semibold text-white">飞行日志</h2>
        <span className="ml-auto text-xs text-gray-500">{sorted.length} 条</span>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 scrollbar-thin">
        {sorted.length === 0 && (
          <p className="text-center text-gray-500 text-sm py-8">暂无飞行日志</p>
        )}

        <div className="relative">
          <div className="absolute left-[38px] top-2 bottom-2 w-px bg-space-border" />

          {sorted.map((log) => {
            const config = eventConfig[log.eventType];
            const Icon = config.icon;

            return (
              <div key={log.id} className="relative flex gap-3 pb-5 last:pb-0">
                <div className="w-[36px] flex-shrink-0 flex items-start justify-center pt-3">
                  <span className="text-[11px] text-gray-500 font-mono tabular-nums">
                    {formatTime(log.timestamp)}
                  </span>
                </div>

                <div className="relative flex flex-col items-center flex-shrink-0 pt-3">
                  <div className={`w-2.5 h-2.5 rounded-full ${config.dotColor} ring-2 ring-deep-space z-10`} />
                </div>

                <div className="flex-1 min-w-0 rounded-lg bg-deep-space/60 border border-space-border p-3">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-medium border ${config.color}`}>
                      <Icon className="w-3 h-3" />
                      {config.label}
                    </span>

                    {log.hasMissingField && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border bg-red-500/20 text-red-400 border-red-500/40">
                        缺字段
                      </span>
                    )}

                    {log.isLateEntry && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border bg-late-blue/20 text-late-blue border-late-blue/40">
                        晚补
                      </span>
                    )}

                    {log.isNoteModified && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border bg-note-yellow/20 text-note-yellow border-note-yellow/40">
                        备注改
                      </span>
                    )}
                  </div>

                  <p className="mt-1.5 text-sm text-gray-200 leading-relaxed">
                    {log.description}
                  </p>

                  {log.isNoteModified && log.noteOriginal && (
                    <p className="mt-1 text-xs text-gray-500 line-through">
                      {log.noteOriginal}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
