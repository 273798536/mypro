import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { useAppStore } from '../store';

export default function TimeAxis() {
  const {
    currentTimeIndex,
    timePoints,
    isPlaying,
    setCurrentTimeIndex,
    setIsPlaying,
  } = useAppStore();

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTimeIndex((currentTimeIndex + 1) % timePoints.length);
      }, 1000);
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
  }, [isPlaying, currentTimeIndex, timePoints.length, setCurrentTimeIndex]);

  const currentTimePoint = timePoints[currentTimeIndex];

  const getTrafficColor = (volume: number) => {
    if (volume > 0.8) return 'bg-red-500';
    if (volume > 0.5) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-20 bg-slate-900/95 backdrop-blur-sm border-t border-slate-700 px-6">
      <div className="h-full flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <div className="text-2xl font-bold text-white font-mono">
            {String(currentTimePoint.hour).padStart(2, '0')}:00
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentTimeIndex((currentTimeIndex - 1 + timePoints.length) % timePoints.length)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-3 rounded-lg transition-colors ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-500'
                : 'bg-blue-600 hover:bg-blue-500'
            } text-white`}
          >
            {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setCurrentTimeIndex((currentTimeIndex + 1) % timePoints.length)}
            className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1">
          <div className="relative">
            <input
              type="range"
              min="0"
              max="23"
              value={currentTimeIndex}
              onChange={(e) => setCurrentTimeIndex(Number(e.target.value))}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between mt-2 text-xs text-slate-400">
              {[0, 6, 12, 18, 23].map((h) => (
                <span key={h}>{String(h).padStart(2, '0')}:00</span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-xs text-slate-400">车速系数</div>
            <div className="text-sm font-semibold text-white">
              {currentTimePoint.speedMultiplier.toFixed(1)}x
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">交通流量</div>
            <div className="flex items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full ${getTrafficColor(
                  currentTimePoint.trafficVolume
                )}`}
              />
              <span className="text-sm font-semibold text-white">
                {(currentTimePoint.trafficVolume * 100).toFixed(0)}%
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
