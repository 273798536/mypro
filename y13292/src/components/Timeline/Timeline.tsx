import { useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock, Camera, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { useComplaintStore } from '../../store/useComplaintStore';
import { eventTypeLabels } from '../../types';
import type { TimelineEventType } from '../../types';
import { cn } from '../../lib/utils';

const eventIconMap: Record<TimelineEventType, typeof Clock> = {
  complaint: Clock,
  photo: Camera,
  confirm: CheckCircle,
  overload: AlertTriangle,
  update: RefreshCw,
};

const eventColorMap: Record<TimelineEventType, string> = {
  complaint: 'text-sky-400 bg-sky-500/20',
  photo: 'text-purple-400 bg-purple-500/20',
  confirm: 'text-emerald-400 bg-emerald-500/20',
  overload: 'text-orange-400 bg-orange-500/20',
  update: 'text-cyan-400 bg-cyan-500/20',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Timeline() {
  const {
    getSelectedPoint,
    getTimelineByPointId,
    setCurrentTime,
    currentTime,
  } = useComplaintStore();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const timelineRef = useRef<HTMLDivElement>(null);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const point = getSelectedPoint();
  const events = point ? getTimelineByPointId(point.id) : [];

  useEffect(() => {
    setCurrentIndex(events.length > 0 ? events.length - 1 : -1);
    setIsPlaying(false);
    if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }
  }, [point?.id]);

  useEffect(() => {
    if (isPlaying && events.length > 0) {
      let idx = currentIndex < 0 ? 0 : currentIndex + 1;
      if (idx >= events.length) {
        idx = 0;
      }
      setCurrentIndex(idx);
      setCurrentTime(events[idx].eventAt);

      playIntervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          const next = prev + 1;
          if (next >= events.length) {
            setIsPlaying(false);
            return prev;
          }
          setCurrentTime(events[next].eventAt);
          return next;
        });
      }, 1500);
    } else if (playIntervalRef.current) {
      clearInterval(playIntervalRef.current);
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, events.length]);

  const handlePlayPause = () => {
    if (currentIndex >= events.length - 1) {
      setCurrentIndex(0);
      if (events[0]) {
        setCurrentTime(events[0].eventAt);
      }
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => {
      const next = Math.max(0, prev - 1);
      if (events[next]) {
        setCurrentTime(events[next].eventAt);
      }
      return next;
    });
  };

  const handleSkipForward = () => {
    setIsPlaying(false);
    setCurrentIndex((prev) => {
      const next = Math.min(events.length - 1, prev + 1);
      if (events[next]) {
        setCurrentTime(events[next].eventAt);
      }
      return next;
    });
  };

  const handleEventClick = (index: number) => {
    setIsPlaying(false);
    setCurrentIndex(index);
    setCurrentTime(events[index].eventAt);
  };

  if (!point) {
    return (
      <div className="h-full flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50">
        <p className="text-sm text-slate-500">选择点位查看时间线</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-slate-900/50 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-medium text-slate-200">历史时间线</span>
          <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
            {events.length} 个事件
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleSkipBack}
            disabled={currentIndex <= 0}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={handlePlayPause}
            disabled={events.length === 0}
            className="p-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-white disabled:opacity-30 disabled:hover:bg-sky-600 transition-colors"
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={handleSkipForward}
            disabled={currentIndex >= events.length - 1}
            className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 p-4 overflow-hidden">
        {events.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-500">
            暂无时间线事件
          </div>
        ) : (
          <div ref={timelineRef} className="relative h-full">
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-slate-700 -translate-y-1/2" />

            <div className="relative h-full flex items-center">
              <div className="flex items-start justify-between w-full gap-2 px-2">
                {events.map((event, index) => {
                  const Icon = eventIconMap[event.type];
                  const isActive = index <= currentIndex;
                  const isCurrent = index === currentIndex;

                  return (
                    <button
                      key={event.id}
                      onClick={() => handleEventClick(index)}
                      className="flex flex-col items-center flex-shrink-0 group"
                      style={{ width: `${100 / events.length}%` }}
                    >
                      <div
                        className={cn(
                          'relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300',
                          isActive
                            ? eventColorMap[event.type]
                            : 'bg-slate-800 text-slate-600',
                          isCurrent && 'ring-2 ring-white/50 scale-110'
                        )}
                      >
                        <Icon className="w-4 h-4" />
                        {isCurrent && (
                          <div
                            className="absolute inset-0 rounded-full animate-ping opacity-30"
                            style={{ backgroundColor: 'currentColor' }}
                          />
                        )}
                      </div>

                      <div
                        className={cn(
                          'mt-2 text-[10px] text-center transition-colors max-w-full px-1',
                          isCurrent ? 'text-slate-200' : 'text-slate-500'
                        )}
                      >
                        <div className="font-medium truncate">{eventTypeLabels[event.type]}</div>
                        <div className="text-[9px] opacity-70 mt-0.5">
                          {formatDate(event.eventAt).split(' ')[1]}
                        </div>
                      </div>

                      <div
                        className={cn(
                          'absolute top-0 mt-12 w-40 p-2 rounded-lg bg-slate-800 border border-slate-700 text-[11px] text-left opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-10',
                          'before:content-[""] before:absolute before:top-0 before:left-1/2 before:-translate-x-1/2 before:-translate-y-full before:border-4 before:border-transparent before:border-b-slate-700'
                        )}
                        style={{ left: '50%', transform: 'translateX(-50%)' }}
                      >
                        <div className="font-medium text-slate-200">{event.title}</div>
                        <div className="text-slate-400 mt-1 line-clamp-2">
                          {event.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {currentIndex >= 0 && events[currentIndex] && (
        <div className="px-4 py-3 border-t border-slate-700/50 bg-slate-800/30">
          <div className="flex items-start gap-3">
            <div
              className={cn(
                'p-2 rounded-lg flex-shrink-0',
                eventColorMap[events[currentIndex].type]
              )}
            >
              {(() => {
                const Icon = eventIconMap[events[currentIndex].type];
                return <Icon className="w-4 h-4" />;
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-slate-200">
                {events[currentIndex].title}
              </div>
              <div className="text-xs text-slate-400 mt-1">
                {events[currentIndex].description}
              </div>
              <div className="text-[11px] text-slate-500 mt-1">
                {formatDate(events[currentIndex].eventAt)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
