import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Gauge } from 'lucide-react';
import { useBatteryStore } from '../../store/useBatteryStore';

export const TimelineControl = () => {
  const {
    currentBatch,
    currentCycleIndex,
    isPlaying,
    playbackSpeed,
    setCycleIndex,
    togglePlayback,
    setPlaybackSpeed
  } = useBatteryStore();

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!currentBatch) return;

    const animate = (time: number) => {
      if (isPlaying) {
        const delta = time - lastTimeRef.current;
        if (delta > 100 / playbackSpeed) {
          setCycleIndex(currentCycleIndex + 1);
          if (currentCycleIndex >= currentBatch.cycles.length - 1) {
            setCycleIndex(0);
          }
          lastTimeRef.current = time;
        }
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, currentCycleIndex, currentBatch, playbackSpeed, setCycleIndex]);

  if (!currentBatch) return null;

  const totalCycles = currentBatch.cycles.length;
  const progress = ((currentCycleIndex + 1) / totalCycles) * 100;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-dark-light/90 backdrop-blur-sm border-t border-dark-lighter p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={() => setCycleIndex(0)}
            className="p-2 rounded-lg bg-dark-lighter hover:bg-dark-lighter/80 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={togglePlayback}
            className="p-3 rounded-lg bg-primary hover:bg-primary/80 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-dark" />
            ) : (
              <Play className="w-5 h-5 text-dark" />
            )}
          </button>
          <button
            onClick={() => setCycleIndex(totalCycles - 1)}
            className="p-2 rounded-lg bg-dark-lighter hover:bg-dark-lighter/80 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2 ml-4">
            <Gauge className="w-4 h-4 text-gray-400" />
            {[0.5, 1, 2, 4].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaybackSpeed(speed)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  playbackSpeed === speed
                    ? 'bg-primary text-dark'
                    : 'bg-dark-lighter hover:bg-dark-lighter/80'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>

          <div className="ml-auto font-mono text-sm">
            <span className="text-primary">{String(currentCycleIndex + 1).padStart(3, '0')}</span>
            <span className="text-gray-500"> / </span>
            <span className="text-gray-400">{String(totalCycles).padStart(3, '0')}</span>
          </div>
        </div>

        <div className="relative">
          <div className="h-2 bg-dark-lighter rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary/60 transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={totalCycles - 1}
            value={currentCycleIndex}
            onChange={(e) => setCycleIndex(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-primary rounded-full shadow-lg shadow-primary/50 pointer-events-none transition-all duration-100"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>

        <div className="flex justify-between mt-1 text-xs text-gray-500">
          <span>开始</span>
          <span>{Math.round(progress)}%</span>
          <span>结束</span>
        </div>
      </div>
    </div>
  );
};
