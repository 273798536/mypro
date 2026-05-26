import React, { useEffect, useRef } from 'react';
import { GameEvent } from '../../engine/types';
import { getEventBgColor, getEventColor, getEventTypeLabel } from '../../engine/events';
import { formatTime } from '../../utils/format';

interface EventLogProps {
  events: GameEvent[];
  totalTime: number;
  timeRemaining: number;
}

export const EventLog: React.FC<EventLogProps> = ({ events, totalTime, timeRemaining }) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [events]);

  const gameTime = totalTime - timeRemaining;

  return (
    <div className="bg-terminal-panel rounded-lg border border-terminal-border overflow-hidden flex flex-col h-full">
      <div className="px-4 py-2 border-b border-terminal-border">
        <h3 className="text-sm font-semibold text-gray-300">事件日志</h3>
      </div>
      
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-1 min-h-48">
        {events.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-4">
            暂无事件
          </div>
        ) : (
          events.map((event) => {
            const eventGameTime = event.timestamp / 1000;
            return (
              <div
                key={event.id}
                className={`p-2 rounded border text-xs animate-slide-in ${getEventBgColor(event.severity)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`font-semibold ${getEventColor(event.severity)}`}>
                    {getEventTypeLabel(event.type)}
                  </span>
                  <span className="text-gray-500">
                    {formatTime(eventGameTime)}
                  </span>
                </div>
                <p className="text-gray-300">{event.message}</p>
                {event.effect.priceChange && (
                  <p className={`text-xs mt-1 ${event.effect.priceChange > 0 ? 'text-trade-up' : 'text-trade-down'}`}>
                    价格跳空 {event.effect.priceChange > 0 ? '+' : ''}{event.effect.priceChange.toFixed(2)}
                  </p>
                )}
                {event.duration > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    持续 {event.duration / 1000} 秒
                  </p>
                )}
              </div>
            );
          })
        )}
      </div>
      
      <div className="px-4 py-2 border-t border-terminal-border text-xs text-gray-500">
        游戏时间: {formatTime(gameTime)} / {formatTime(totalTime)}
      </div>
    </div>
  );
};
