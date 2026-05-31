import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Gauge } from 'lucide-react';
import useAppStore from '@/store/useAppStore';

export default function TimeAxis() {
  const currentTime = useAppStore((state) => state.currentTime);
  const setCurrentTime = useAppStore((state) => state.setCurrentTime);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const setPlaying = useAppStore((state) => state.setPlaying);
  const playSpeed = useAppStore((state) => state.playSpeed);
  const setPlaySpeed = useAppStore((state) => state.setPlaySpeed);
  const anomalies = useAppStore((state) => state.anomalies);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        let newMonth = currentTime.month + 1;
        let newYear = currentTime.year;
        if (newMonth > 12) {
          newMonth = 1;
          newYear++;
        }
        if (newYear > 2024 || (newYear === 2024 && newMonth > 12)) {
          newYear = 2024;
          newMonth = 1;
        }
        setCurrentTime({ year: newYear, month: newMonth });
      }, 1000 / playSpeed);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, playSpeed, currentTime, setCurrentTime]);

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const anomalyMonths = new Set(
    anomalies.filter((a) => a.month).map((a) => `2024-${a.month}`)
  );

  const handleSliderChange = (value: number) => {
    setCurrentTime({ year: 2024, month: value });
  };

  const skipToStart = () => setCurrentTime({ year: 2024, month: 1 });
  const skipToEnd = () => setCurrentTime({ year: 2024, month: 12 });
  const stepForward = () => {
    let newMonth = currentTime.month + 1;
    let newYear = currentTime.year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    }
    setCurrentTime({ year: newYear, month: newMonth });
  };
  const stepBackward = () => {
    let newMonth = currentTime.month - 1;
    let newYear = currentTime.year;
    if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    setCurrentTime({ year: newYear, month: newMonth });
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 z-10 bg-slate-900/90 backdrop-blur-md border-t border-slate-700/50 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-3">
          <button
            onClick={skipToStart}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="跳到开始"
          >
            <SkipBack className="w-5 h-5 text-slate-400" />
          </button>
          <button
            onClick={stepBackward}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="上一月"
          >
            <SkipBack className="w-5 h-5 text-slate-300" style={{ transform: 'scaleX(-1)' }} />
          </button>
          <button
            onClick={() => setPlaying(!isPlaying)}
            className={`p-3 rounded-xl transition-all ${
              isPlaying
                ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                : 'bg-blue-500/20 text-blue-400 hover:bg-blue-500/30'
            }`}
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>
          <button
            onClick={stepForward}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="下一月"
          >
            <SkipForward className="w-5 h-5 text-slate-300" />
          </button>
          <button
            onClick={skipToEnd}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
            title="跳到结束"
          >
            <SkipForward className="w-5 h-5 text-slate-400" />
          </button>

          <div className="flex-1 flex items-center gap-3">
            <span className="text-white font-mono text-lg min-w-24">
              {currentTime.year}年{currentTime.month}月
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Gauge className="w-4 h-4 text-slate-400" />
            <select
              value={playSpeed}
              onChange={(e) => setPlaySpeed(Number(e.target.value))}
              className="bg-slate-800 text-slate-300 text-sm px-2 py-1 rounded border border-slate-700 outline-none"
            >
              <option value={0.5}>0.5x</option>
              <option value={1}>1x</option>
              <option value={2}>2x</option>
              <option value={4}>4x</option>
            </select>
          </div>
        </div>

        <div className="relative">
          <div className="absolute -top-2 left-0 right-0 h-2 flex">
            {months.map((month) => (
              <div key={month} className="flex-1 relative">
                {anomalyMonths.has(`2024-${month}`) && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-red-500 rounded-full" />
                )}
              </div>
            ))}
          </div>

          <input
            type="range"
            min="1"
            max="12"
            value={currentTime.month}
            onChange={(e) => handleSliderChange(Number(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-4
              [&::-webkit-slider-thumb]:h-4
              [&::-webkit-slider-thumb]:bg-blue-500
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-125"
          />

          <div className="flex justify-between mt-2">
            {months.map((month) => (
              <span
                key={month}
                className={`text-xs ${
                  month === currentTime.month ? 'text-blue-400 font-semibold' : 'text-slate-500'
                }`}
              >
                {month}月
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
