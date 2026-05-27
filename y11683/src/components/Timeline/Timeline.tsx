import { useStore } from '../../store/useStore';
import { Play, Pause, SkipBack, SkipForward, GripVertical } from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';

export default function Timeline() {
  const { data, timeWindowIndex, setTimeWindowIndex, isPlaying, setIsPlaying, playSpeed, setPlaySpeed } = useStore();
  const timeWindows = [...new Set(data.map((d) => d.timeWindow))].sort();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPlaying = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const startPlaying = useCallback(() => {
    stopPlaying();
    intervalRef.current = setInterval(() => {
      setTimeWindowIndex(
        (timeWindowIndex + 1) % Math.max(timeWindows.length, 1)
      );
    }, 1000 / playSpeed);
  }, [timeWindowIndex, timeWindows.length, playSpeed, setTimeWindowIndex, stopPlaying]);

  useEffect(() => {
    if (isPlaying && timeWindows.length > 1) {
      startPlaying();
    } else {
      stopPlaying();
    }
    return stopPlaying;
  }, [isPlaying, playSpeed, startPlaying, stopPlaying, timeWindows.length]);

  if (timeWindows.length === 0) {
    return (
      <div className="h-14 bg-slate-900/80 backdrop-blur border-t border-slate-700/50 flex items-center justify-center text-slate-500 text-sm">
        暂无数据，请上传或加载模拟数据
      </div>
    );
  }

  const progress = timeWindows.length > 1 ? (timeWindowIndex / (timeWindows.length - 1)) * 100 : 0;

  return (
    <div className="h-14 bg-slate-900/80 backdrop-blur border-t border-slate-700/50 flex items-center px-4 gap-4">
      <div className="flex items-center gap-1">
        <button
          onClick={() => setTimeWindowIndex(Math.max(0, timeWindowIndex - 1))}
          className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`p-2 rounded transition-colors ${
            isPlaying
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
        >
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button
          onClick={() =>
            setTimeWindowIndex(
              (timeWindowIndex + 1) % Math.max(timeWindows.length, 1)
            )
          }
          className="p-1.5 hover:bg-slate-800 rounded transition-colors text-slate-400 hover:text-slate-200"
        >
          <SkipForward size={16} />
        </button>
      </div>

      <div className="flex-1 flex items-center gap-3">
        <span className="text-xs text-slate-500 font-mono w-20">
          {timeWindows[timeWindowIndex]}
        </span>

        <div className="flex-1 relative group">
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <input
            type="range"
            min={0}
            max={timeWindows.length - 1}
            value={timeWindowIndex}
            onChange={(e) => setTimeWindowIndex(parseInt(e.target.value))}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />

          <div className="absolute -bottom-4 left-0 right-0 flex justify-between px-0.5 pointer-events-none">
            {timeWindows.map((tw, i) => (
              <div
                key={tw}
                className={`w-1 h-1 rounded-full transition-colors ${
                  i <= timeWindowIndex ? 'bg-blue-500' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>

        <span className="text-xs text-slate-500 font-mono w-20 text-right">
          {timeWindows[timeWindows.length - 1]}
        </span>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <GripVertical size={12} className="text-slate-600" />
        <input
          type="range"
          min={0.5}
          max={3}
          step={0.5}
          value={playSpeed}
          onChange={(e) => setPlaySpeed(parseFloat(e.target.value))}
          className="w-16 accent-blue-500"
        />
        <span className="w-10">{playSpeed}x</span>
      </div>
    </div>
  );
}