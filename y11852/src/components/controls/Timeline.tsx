import { useRef, useCallback, useMemo } from 'react';
import { usePlaybackStore } from '@/store/usePlaybackStore';
import { useDataStore } from '@/store/useDataStore';
import { getFrequencyColor } from '@/engine/acoustics';
import { Play, Pause, SkipBack, SkipForward, RotateCcw, Gauge } from 'lucide-react';

export const Timeline = () => {
  const {
    isPlaying,
    currentTime,
    duration,
    speed,
    currentFrame,
    totalFrames,
    togglePlaying,
    setCurrentTime,
    setSpeed,
    stepForward,
    stepBackward,
    reset,
  } = usePlaybackStore();

  const { soundRays, activeFrequencyBand } = useDataStore();
  const progressRef = useRef<HTMLDivElement>(null);

  const progress = useMemo(() => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  }, [currentTime, duration]);

  const keyframes = useMemo(() => {
    if (soundRays.length === 0) return [];
    const times = new Set<number>();
    soundRays.forEach((ray) => {
      ray.times.forEach((t) => times.add(Math.round(t * 100) / 100));
    });
    return Array.from(times).sort((a, b) => a - b);
  }, [soundRays]);

  const handleProgressClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      setCurrentTime(percentage * duration);
    }
  }, [duration, setCurrentTime]);

  const formatTime = (time: number): string => {
    return `${time.toFixed(2)}s`;
  };

  const speedOptions = [0.5, 1, 2, 4];

  const rayCountByBand = useMemo(() => {
    const counts = { low: 0, mid: 0, high: 0 };
    soundRays.forEach((ray) => {
      counts[ray.frequency]++;
    });
    return counts;
  }, [soundRays]);

  return (
    <div className="h-20 bg-zinc-900/90 backdrop-blur-xl border-t border-zinc-800 px-4 py-2">
      <div className="h-full flex items-center gap-4">
        <div className="flex items-center gap-1">
          <button
            onClick={reset}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="重置"
          >
            <RotateCcw size={14} />
          </button>
          <button
            onClick={stepBackward}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="后退一帧"
          >
            <SkipBack size={14} />
          </button>
          <button
            onClick={togglePlaying}
            className="w-10 h-10 rounded-xl flex items-center justify-center transition-all hover:scale-105"
            style={{
              backgroundColor: getFrequencyColor(activeFrequencyBand),
              boxShadow: `0 0 20px ${getFrequencyColor(activeFrequencyBand)}40`,
            }}
            title={isPlaying ? '暂停' : '播放'}
          >
            {isPlaying ? (
              <Pause size={18} className="text-white" />
            ) : (
              <Play size={18} className="text-white ml-0.5" />
            )}
          </button>
          <button
            onClick={stepForward}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
            title="前进一帧"
          >
            <SkipForward size={14} />
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-1 rounded-lg bg-zinc-800/50 border border-zinc-700">
          <Gauge size={12} className="text-zinc-500" />
          {speedOptions.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                speed === s
                  ? 'text-white bg-zinc-700'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col justify-center gap-1">
          <div
            ref={progressRef}
            onClick={handleProgressClick}
            className="relative h-6 cursor-pointer group"
          >
            <div className="absolute inset-0 top-1/2 -translate-y-1/2 left-0 right-0 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
              <div className="h-full flex">
                <div
                  className="h-full transition-all duration-75"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(to right, #FF4D6D, #4ECDC4, #4D96FF)`,
                  }}
                />
              </div>

              {keyframes.map((time, idx) => {
                const position = (time / duration) * 100;
                if (position > 100) return null;
                return (
                  <div
                    key={idx}
                    className="absolute top-0 w-0.5 h-full bg-white/30"
                    style={{ left: `${position}%` }}
                    title={`${time.toFixed(2)}s`}
                  />
                );
              })}
            </div>

            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{
                left: `calc(${progress}% - 8px)`,
                boxShadow: `0 0 10px ${getFrequencyColor(activeFrequencyBand)}`,
              }}
            />

            <div className="flex justify-between text-[10px] text-zinc-500 font-mono">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-[10px] text-zinc-500">
            <span>
              帧: {currentFrame} / {totalFrames}</span>
            {soundRays.length > 0 && (
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#FF4D6D' }} />
                  低频 {rayCountByBand.low}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4ECDC4' }} />
                  中频 {rayCountByBand.mid}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#4D96FF' }} />
                  高频 {rayCountByBand.high}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
