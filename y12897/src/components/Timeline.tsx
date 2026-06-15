import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Waves, Clock, Gauge } from 'lucide-react';
import { useSceneStore, useDataStore } from '@/stores';
import { formatTime } from '@/utils/geo';
import { cn } from '@/lib/utils';

export function Timeline() {
  const {
    currentFrameIndex,
    isPlaying,
    playSpeed,
    setFrameIndex,
    setPlaying,
    setPlaySpeed,
  } = useSceneStore();
  const { oilSpillFrames, tidalWindows } = useDataStore();
  const intervalRef = useRef<number | null>(null);

  const totalFrames = oilSpillFrames.length;
  const currentFrame = oilSpillFrames[currentFrameIndex] || oilSpillFrames[0];

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setFrameIndex((prev) => {
          if (prev >= totalFrames - 1) {
            return 0;
          }
          return prev + 1;
        });
      }, 1000 / playSpeed);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playSpeed, totalFrames, setFrameIndex]);

  const handleTimelineClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percent = Math.max(0, Math.min(1, x / rect.width));
    const frameIndex = Math.floor(percent * (totalFrames - 1));
    setFrameIndex(frameIndex);
  };

  const getTideWindowsOnTimeline = () => {
    if (oilSpillFrames.length < 2) return [];
    const startTime = new Date(oilSpillFrames[0].timestamp).getTime();
    const endTime = new Date(oilSpillFrames[oilSpillFrames.length - 1].timestamp).getTime();
    const duration = endTime - startTime;

    return tidalWindows
      .map((tide) => {
        const tideStart = new Date(tide.startTime).getTime();
        const tideEnd = new Date(tide.endTime).getTime();
        const left = ((tideStart - startTime) / duration) * 100;
        const width = ((tideEnd - tideStart) / duration) * 100;
        const right = left + width;
        if (right < 0 || left > 100) return null;
        return { ...tide, left: Math.max(0, left), width: Math.min(100 - left, width) };
      })
      .filter(Boolean);
  };

  const tideWindows = getTideWindowsOnTimeline();
  const progress = totalFrames > 1 ? (currentFrameIndex / (totalFrames - 1)) * 100 : 0;

  const getCurrentTide = () => {
    const currentTime = new Date(currentFrame.timestamp).getTime();
    return tidalWindows.find(
      (t) =>
        currentTime >= new Date(t.startTime).getTime() &&
        currentTime <= new Date(t.endTime).getTime()
    );
  };

  const currentTide = getCurrentTide();

  return (
    <div className="h-28 bg-slate-900/90 backdrop-blur-sm border-t border-slate-700/50 px-6 py-3 flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sm">
            <span className="text-slate-400">当前时间: </span>
            <span className="text-cyan-300 font-mono font-medium">
              {formatTime(currentFrame.timestamp)}
            </span>
          </div>
          {currentTide && (
            <div
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 rounded text-xs',
                currentTide.type === 'flood' && 'bg-blue-900/50 text-blue-300 border border-blue-700/50',
                currentTide.type === 'ebb' && 'bg-teal-900/50 text-teal-300 border border-teal-700/50',
                currentTide.type === 'slack' && 'bg-purple-900/50 text-purple-300 border border-purple-700/50'
              )}
            >
              <Waves size={12} />
              {currentTide.label}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <Gauge size={14} className="text-slate-500" />
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaySpeed(speed)}
                className={cn(
                  'px-2 py-0.5 text-xs rounded transition-colors',
                  playSpeed === speed
                    ? 'bg-cyan-600 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                )}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFrameIndex(0)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <SkipBack size={18} />
          </button>
          <button
            onClick={() => setPlaying(!isPlaying)}
            className="p-2 rounded-full bg-cyan-600 hover:bg-cyan-500 text-white transition-colors"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button
            onClick={() => setFrameIndex(totalFrames - 1)}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <SkipForward size={18} />
          </button>
        </div>

        <div
          className="flex-1 h-6 relative cursor-pointer group"
          onClick={handleTimelineClick}
        >
          <div className="absolute inset-y-0 left-0 right-0 my-auto h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>

          {tideWindows.map(
            (tide, i) =>
              tide && (
                <div
                  key={tide.id}
                  className={cn(
                    'absolute top-0 bottom-0 my-auto h-2 rounded',
                    tide.type === 'flood' && 'bg-blue-500/40',
                    tide.type === 'ebb' && 'bg-teal-500/40',
                    tide.type === 'slack' && 'bg-purple-500/40'
                  )}
                  style={{ left: `${tide.left}%`, width: `${tide.width}%` }}
                  title={tide.label}
                />
              )
          )}

          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-lg shadow-cyan-500/50 opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>

        <div className="text-xs text-slate-500 font-mono w-16 text-right">
          {currentFrameIndex + 1}/{totalFrames}
        </div>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>{formatTime(oilSpillFrames[0]?.timestamp || '')}</span>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 bg-blue-500/40 rounded" />
            涨潮
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 bg-teal-500/40 rounded" />
            落潮
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-1.5 bg-purple-500/40 rounded" />
            憩流
          </span>
        </div>
        <span>{formatTime(oilSpillFrames[oilSpillFrames.length - 1]?.timestamp || '')}</span>
      </div>
    </div>
  );
}
