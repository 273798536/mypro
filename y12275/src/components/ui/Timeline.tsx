import { useMemo, useState, useRef, useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { useSandboxStore } from '../../store/useSandboxStore';

export function Timeline() {
  const { conflicts, timeRange, currentTime, setCurrentTime, filterTypes, filterSeverities } =
    useSandboxStore();
  const [isPlaying, setIsPlaying] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  const filteredConflicts = useMemo(() => {
    return conflicts.filter(
      (c) => filterTypes.includes(c.type) && filterSeverities.includes(c.severity)
    );
  }, [conflicts, filterTypes, filterSeverities]);

  const startTimestamp = useMemo(() => new Date(timeRange.start).getTime(), [timeRange.start]);
  const endTimestamp = useMemo(() => new Date(timeRange.end).getTime(), [timeRange.end]);
  const currentTimestamp = useMemo(() => new Date(currentTime).getTime(), [currentTime]);

  const progress = useMemo(() => {
    return ((currentTimestamp - startTimestamp) / (endTimestamp - startTimestamp)) * 100;
  }, [currentTimestamp, startTimestamp, endTimestamp]);

  const conflictMarkers = useMemo(() => {
    return filteredConflicts.map((conflict) => {
      const start = new Date(conflict.startTime).getTime();
      const end = new Date(conflict.endTime).getTime();
      const startPos = ((start - startTimestamp) / (endTimestamp - startTimestamp)) * 100;
      const endPos = ((end - startTimestamp) / (endTimestamp - startTimestamp)) * 100;
      return {
        id: conflict.id,
        startPos: Math.max(0, Math.min(100, startPos)),
        endPos: Math.max(0, Math.min(100, endPos)),
        type: conflict.type,
        severity: conflict.severity,
      };
    });
  }, [filteredConflicts, startTimestamp, endTimestamp]);

  useEffect(() => {
    if (isPlaying) {
      const step = (endTimestamp - startTimestamp) / 1000;
      const animate = () => {
        const now = new Date(currentTime).getTime();
        const next = now + step * 50;
        if (next >= endTimestamp) {
          setCurrentTime(timeRange.start);
        } else {
          setCurrentTime(new Date(next).toISOString());
        }
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    }
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentTime, endTimestamp, startTimestamp, timeRange.start, setCurrentTime]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!timelineRef.current) return;
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const newTime = startTimestamp + percentage * (endTimestamp - startTimestamp);
    setCurrentTime(new Date(newTime).toISOString());
  };

  const formatTime = (time: string) => {
    return new Date(time).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const typeColors = {
    gate_conflict: 'bg-red-500',
    taxi_crossing: 'bg-yellow-500',
    wait_timeout: 'bg-orange-500',
  };

  return (
    <div className="bg-slate-900/95 border-t border-slate-700/50 px-4 py-3">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <Clock className="w-4 h-4 text-slate-400" />
          <span className="text-sm text-slate-300 font-mono">
            {formatTime(currentTime)}
          </span>
          <div className="flex-1" />
          <span className="text-xs text-slate-500">
            {formatTime(timeRange.start)} - {formatTime(timeRange.end)}
          </span>
        </div>

        <div
          ref={timelineRef}
          onClick={handleTimelineClick}
          className="relative h-12 bg-slate-800/50 rounded-lg cursor-pointer overflow-hidden border border-slate-700/50"
        >
          {conflictMarkers.map((marker) => (
            <div
              key={marker.id}
              className={`absolute top-2 bottom-2 ${typeColors[marker.type]} opacity-60 rounded`}
              style={{
                left: `${marker.startPos}%`,
                width: `${Math.max(2, marker.endPos - marker.startPos)}%`,
              }}
            />
          ))}

          <div
            className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 z-10"
            style={{ left: `${progress}%` }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full shadow-lg shadow-cyan-400/50" />
          </div>

          <div className="absolute bottom-0 left-0 right-0 h-6">
            {[0, 25, 50, 75, 100].map((tick) => (
              <div
                key={tick}
                className="absolute bottom-0 w-px h-2 bg-slate-600"
                style={{ left: `${tick}%` }}
              />
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center gap-2 mt-3">
          <button
            onClick={() => setCurrentTime(timeRange.start)}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
          >
            <SkipBack className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-3 bg-cyan-500 hover:bg-cyan-400 rounded-full transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>
          <button
            onClick={() => setCurrentTime(timeRange.end)}
            className="p-2 hover:bg-slate-700 rounded transition-colors"
          >
            <SkipForward className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
}
