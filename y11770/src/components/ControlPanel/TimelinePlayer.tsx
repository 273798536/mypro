import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, RotateCcw } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function TimelinePlayer() {
  const {
    months,
    currentMonth,
    playbackSpeed,
    isPlaying,
    setCurrentMonth,
    setIsPlaying,
    setPlaybackSpeed,
  } = useAppStore();

  const intervalRef = useRef<number | null>(null);
  const currentIndex = months.indexOf(currentMonth);

  useEffect(() => {
    if (isPlaying) {
      const delay = 1000 / playbackSpeed;
      intervalRef.current = window.setInterval(() => {
        const state = useAppStore.getState();
        const idx = state.months.indexOf(state.currentMonth);
        if (idx >= state.months.length - 1) {
          state.setIsPlaying(false);
        } else {
          state.setCurrentMonth(state.months[idx + 1]);
        }
      }, delay);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playbackSpeed]);

  const handlePlayPause = () => {
    if (currentIndex >= months.length - 1) {
      setCurrentMonth(months[0]);
    }
    setIsPlaying(!isPlaying);
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentMonth(months[currentIndex - 1]);
    }
  };

  const handleNext = () => {
    if (currentIndex < months.length - 1) {
      setCurrentMonth(months[currentIndex + 1]);
    }
  };

  const handleReset = () => {
    setCurrentMonth(months[0]);
    setIsPlaying(false);
  };

  return (
    <div className="bg-slate-800/80 backdrop-blur-sm rounded-xl p-4 border border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-200">时间轴控制</h3>
        <span className="text-lg font-mono font-bold text-blue-400">{currentMonth}</span>
      </div>

      <div className="relative mb-4">
        <input
          type="range"
          min={0}
          max={months.length - 1}
          value={currentIndex}
          onChange={(e) => setCurrentMonth(months[parseInt(e.target.value)])}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between mt-1">
          {months.filter((_, i) => i % 3 === 0).map((month) => (
            <span key={month} className="text-xs text-slate-500">
              {month.slice(-2)}
            </span>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-center gap-2 mb-4">
        <button
          onClick={handleReset}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
          title="重置"
        >
          <RotateCcw size={18} />
        </button>
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="上一月"
        >
          <SkipBack size={18} />
        </button>
        <button
          onClick={handlePlayPause}
          className="p-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-colors shadow-lg shadow-blue-600/30"
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button
          onClick={handleNext}
          disabled={currentIndex === months.length - 1}
          className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="下一月"
        >
          <SkipForward size={18} />
        </button>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-xs text-slate-400">播放速度:</span>
        <div className="flex gap-1 flex-1">
          {[0.5, 1, 1.5, 2].map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`flex-1 py-1 px-2 rounded text-xs font-medium transition-colors ${
                playbackSpeed === speed
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-400 hover:bg-slate-600'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
