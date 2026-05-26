import React from 'react';
import { useGameStore } from '../../store/useGameStore';
import { formatTime } from '../../utils/export';
import { AlertTriangle, CloudRain, Construction, Users, Car } from 'lucide-react';

const eventIcons: Record<string, React.ReactNode> = {
  roadblock: <Construction size={18} />,
  peak: <Users size={18} />,
  accident: <Car size={18} />,
  weather: <CloudRain size={18} />,
};

const severityColors: Record<string, string> = {
  low: 'border-dispatch-success',
  medium: 'border-dispatch-warning',
  high: 'border-dispatch-danger',
};

export const EventPanel: React.FC = () => {
  const { events, gameTime } = useGameStore();

  const activeEvents = events.filter((e) => !e.resolved);
  const resolvedEvents = events.filter((e) => e.resolved);

  return (
    <div className="space-y-3">
      {activeEvents.length > 0 && (
        <div>
          <div className="text-sm text-dispatch-text-muted mb-2 flex items-center gap-2">
            <AlertTriangle size={14} className="text-dispatch-warning" />
            进行中事件 ({activeEvents.length})
          </div>
          <div className="space-y-2">
            {activeEvents.map((event) => {
              const remainingTime = Math.max(0, event.startTime + event.duration - gameTime);
              const progress = 1 - remainingTime / event.duration;

              return (
                <div
                  key={event.id}
                  className={`bg-dispatch-bg border-l-4 ${severityColors[event.severity]} rounded-r-lg p-3`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg ${
                        event.severity === 'high'
                          ? 'bg-dispatch-danger/20 text-dispatch-danger'
                          : event.severity === 'medium'
                          ? 'bg-dispatch-warning/20 text-dispatch-warning'
                          : 'bg-dispatch-success/20 text-dispatch-success'
                      }`}
                    >
                      {eventIcons[event.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-mono font-semibold text-sm">{event.title}</div>
                      <div className="text-xs text-dispatch-text-muted mt-1">{event.description}</div>
                      {event.affectedArea.length > 0 && (
                        <div className="text-xs text-dispatch-warning mt-1">
                          影响区域: {event.affectedArea.join(', ')}
                        </div>
                      )}
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-dispatch-text-muted mb-1">
                          <span>剩余时间</span>
                          <span>{formatTime(remainingTime)}</span>
                        </div>
                        <div className="h-1 bg-dispatch-panel rounded-full overflow-hidden">
                          <div
                            className="h-full bg-dispatch-warning transition-all duration-1000"
                            style={{ width: `${progress * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {resolvedEvents.length > 0 && (
        <div>
          <div className="text-sm text-dispatch-text-muted mb-2">已结束事件</div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {resolvedEvents.slice(-5).map((event) => (
              <div
                key={event.id}
                className="bg-dispatch-bg border border-dispatch-border rounded-lg p-2 opacity-60"
              >
                <div className="flex items-center gap-2 text-xs">
                  {eventIcons[event.type]}
                  <span className="font-mono">{event.title}</span>
                  <span className="text-dispatch-text-muted ml-auto">
                    {formatTime(event.startTime)} - {formatTime(event.startTime + event.duration)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <div className="text-center py-8 text-dispatch-text-muted text-sm">
          暂无事件
        </div>
      )}
    </div>
  );
};
