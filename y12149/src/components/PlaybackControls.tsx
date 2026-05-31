import React, { useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, SkipBack, SkipForward, AlertTriangle } from 'lucide-react';
import { useSimulationStore } from '@/store/simulationStore';

export const PlaybackControls: React.FC = () => {
  const {
    currentTime,
    isPlaying,
    speed,
    duration,
    issues,
    play,
    pause,
    setTime,
    setSpeed,
    reset,
    clearPausedIssue,
  } = useSimulationStore();

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  const animate = useCallback((timestamp: number) => {
    if (lastTimeRef.current === 0) {
      lastTimeRef.current = timestamp;
    }

    const delta = (timestamp - lastTimeRef.current) / 1000;
    lastTimeRef.current = timestamp;

    const state = useSimulationStore.getState();
    const newTime = state.currentTime + delta * state.speed;

    if (newTime >= state.duration) {
      setTime(state.duration);
      pause();
      return;
    }

    setTime(newTime);
    animationRef.current = requestAnimationFrame(animate);
  }, [setTime, pause]);

  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = 0;
      animationRef.current = requestAnimationFrame(animate);
    } else if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, animate]);

  const progress = (currentTime / duration) * 100;

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    clearPausedIssue();
    setTime(percentage * duration);
  };

  const stepTime = (delta: number) => {
    clearPausedIssue();
    setTime(Math.max(0, Math.min(duration, currentTime + delta)));
  };

  const togglePlay = () => {
    if (isPlaying) {
      pause();
    } else {
      clearPausedIssue();
      if (currentTime >= duration) {
        reset();
      }
      play();
    }
  };

  const speedOptions = [0.5, 1, 2];

  const issueMarkers = issues.filter(i => i.timePoint > 0);

  return (
    <div className="w-full bg-gray-900 text-white px-4 py-3 flex items-center gap-4">
      <div className="flex items-center gap-2">
        <button
          onClick={reset}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="重置"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
        
        <button
          onClick={() => stepTime(-1)}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="后退1秒"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <button
          onClick={togglePlay}
          className="p-3 bg-blue-600 hover:bg-blue-700 rounded-full transition-colors"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5 ml-0.5" />
          )}
        </button>

        <button
          onClick={() => stepTime(1)}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
          title="前进1秒"
        >
          <SkipForward className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1">
        <div className="text-[11px] font-mono text-gray-400 mb-1 flex items-center justify-between">
          <span>时间: <span className="text-white font-bold">{currentTime.toFixed(2)}</span> / {duration.toFixed(1)} s</span>
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-3 h-3 text-red-400" />
            <span>关键时间点: </span>
            {issueMarkers.map((issue, idx) => (
              <span key={issue.id} className="text-red-400">
                {idx > 0 && ', '}
                t={issue.timePoint.toFixed(1)}s
              </span>
            ))}
          </div>
        </div>
        
        <div
          className="relative h-6 bg-gray-700 rounded cursor-pointer group"
          onClick={handleProgressClick}
        >
          <div
            className="absolute left-0 top-0 h-full bg-blue-600 rounded-l transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
          
          {issueMarkers.map(issue => {
            const position = (issue.timePoint / duration) * 100;
            return (
              <div
                key={issue.id}
                className="absolute top-0 w-0 h-0"
                style={{ left: `${position}%` }}
              >
                <div className="absolute -top-1 -left-2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-red-500" />
                <div 
                  className="absolute top-1 -left-px w-0.5 h-5 bg-red-500 opacity-70"
                />
              </div>
            );
          })}

          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg group-hover:scale-125 transition-transform"
            style={{ left: `calc(${progress}% - 8px)` }}
          />

          <div className="absolute inset-x-0 top-0 h-full flex items-center px-2 pointer-events-none">
            {Array.from({ length: 11 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 flex flex-col items-center"
              >
                <div className="w-px h-2 bg-gray-500" />
                <span className="text-[9px] font-mono text-gray-400 mt-0.5">
                  {(i * 2).toFixed(0)}s
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-[11px] font-mono text-gray-400">速度:</span>
        <div className="flex rounded overflow-hidden border border-gray-600">
          {speedOptions.map(s => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1 text-[11px] font-mono transition-colors ${
                speed === s
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      <div className="text-[10px] font-mono text-gray-500 border-l border-gray-700 pl-4">
        <div>空格键: 播放/暂停</div>
        <div>← →: 步进 1s</div>
      </div>
    </div>
  );
};
