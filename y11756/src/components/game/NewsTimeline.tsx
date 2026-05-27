import React from 'react';
import { NewsEvent } from '../../types/game.types';
import { Newspaper, TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface NewsTimelineProps {
  currentEvent: NewsEvent | null;
  eventHistory: NewsEvent[];
}

const NewsTimeline: React.FC<NewsTimelineProps> = ({
  currentEvent,
  eventHistory,
}) => {
  const allEvents = currentEvent
    ? [currentEvent, ...eventHistory.filter(e => e.id !== currentEvent.id)]
    : eventHistory;

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'positive':
        return <TrendingUp className="w-4 h-4 text-green-400" />;
      case 'negative':
        return <TrendingDown className="w-4 h-4 text-red-400" />;
      default:
        return <Minus className="w-4 h-4 text-slate-400" />;
    }
  };

  const getEventBg = (type: string, isCurrent: boolean) => {
    const base = isCurrent ? 'border-l-4 ' : '';
    switch (type) {
      case 'positive':
        return base + (isCurrent ? 'border-green-500 bg-green-500/10' : 'bg-slate-800/50');
      case 'negative':
        return base + (isCurrent ? 'border-red-500 bg-red-500/10' : 'bg-slate-800/50');
      default:
        return base + (isCurrent ? 'border-blue-500 bg-blue-500/10' : 'bg-slate-800/50');
    }
  };

  return (
    <div className="bg-slate-800/50 rounded-2xl p-5 border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Newspaper className="w-5 h-5 text-amber-400" />
        <h3 className="font-semibold text-white">新闻事件</h3>
      </div>

      {allEvents.length === 0 ? (
        <div className="text-center py-8 text-slate-500">
          <Newspaper className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">暂无新闻事件</p>
        </div>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {allEvents.slice(0, 8).map((event, index) => {
            const isCurrent = event.id === currentEvent?.id;
            return (
              <div
                key={event.id}
                className={`p-4 rounded-xl transition-all duration-300 ${getEventBg(event.type, isCurrent)} ${
                  isCurrent ? 'animate-pulse' : ''
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getEventIcon(event.type)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-slate-400">第{event.round}回合</span>
                      {isCurrent && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[10px] rounded-full">
                          最新
                        </span>
                      )}
                    </div>
                    <h4 className="font-medium text-white text-sm mb-1">{event.title}</h4>
                    <p className="text-xs text-slate-400 line-clamp-2">{event.content}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] text-slate-500">来源: {event.source}</span>
                      <div className="flex gap-1">
                        {event.industryAffected.slice(0, 3).map((indId) => (
                          <span
                            key={indId}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              (event.impact[indId] || 0) > 0
                                ? 'bg-green-500/20 text-green-400'
                                : 'bg-red-500/20 text-red-400'
                            }`}
                          >
                            {indId} {(event.impact[indId] || 0) > 0 ? '+' : ''}
                            {((event.impact[indId] || 0) * 100).toFixed(0)}%
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default NewsTimeline;
