import { useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sun,
  Snowflake,
  Leaf,
  Flower2,
} from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { getSunPositionForUI } from '../engine/shadowCalculator';
import type { Season } from '../data/types';

const SEASONS: { value: Season; label: string; icon: typeof Sun }[] = [
  { value: 'spring', label: '春分', icon: Flower2 },
  { value: 'summer', label: '夏至', icon: Sun },
  { value: 'autumn', label: '秋分', icon: Leaf },
  { value: 'winter', label: '冬至', icon: Snowflake },
];

const SPEEDS = [0.5, 1, 2, 4];

export function ShadowPlayer() {
  const currentHour = useAppStore((s) => s.currentHour);
  const currentSeason = useAppStore((s) => s.currentSeason);
  const isPlaying = useAppStore((s) => s.isPlaying);
  const playbackSpeed = useAppStore((s) => s.playbackSpeed);
  const setCurrentHour = useAppStore((s) => s.setCurrentHour);
  const setCurrentSeason = useAppStore((s) => s.setCurrentSeason);
  const setIsPlaying = useAppStore((s) => s.setIsPlaying);
  const setPlaybackSpeed = useAppStore((s) => s.setPlaybackSpeed);
  const setFilters = useAppStore((s) => s.setFilters);

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      return;
    }

    const animate = (time: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const delta = time - lastTimeRef.current;
      const increment = (delta / 1000) * playbackSpeed * 2;

      setCurrentHour((prev) => {
        let next = prev + increment;
        if (next >= 20) {
          next = 5;
        }
        return next;
      });

      lastTimeRef.current = time;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, playbackSpeed, setCurrentHour]);

  const sunPos = getSunPositionForUI(Math.floor(currentHour), currentSeason);

  const handleSeasonChange = (season: Season) => {
    setCurrentSeason(season);
    setFilters({ season });
  };

  return (
    <div className="w-72 bg-slate-900 border-r border-slate-700 flex flex-col">
      <div className="p-3 border-b border-slate-700">
        <h3 className="text-slate-200 text-sm font-semibold mb-3 flex items-center gap-2">
          <Sun className="w-4 h-4 text-yellow-400" />
          阴影播放控制
        </h3>

        <div className="grid grid-cols-4 gap-1 mb-4">
          {SEASONS.map((s) => {
            const Icon = s.icon;
            const isActive = currentSeason === s.value;
            return (
              <button
                key={s.value}
                onClick={() => handleSeasonChange(s.value)}
                className={`flex flex-col items-center gap-1 p-2 rounded-none border transition-colors ${
                  isActive
                    ? 'bg-blue-600 border-blue-500 text-white'
                    : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="text-[10px]">{s.label}</span>
              </button>
            );
          })}
        </div>

        <div className="mb-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-xs font-mono">
              {String(Math.floor(currentHour)).padStart(2, '0')}:
              {String(Math.floor((currentHour % 1) * 60)).padStart(2, '0')}
            </span>
            <span className="text-slate-500 text-xs">太阳位置</span>
          </div>
          <div className="flex gap-4 text-[10px] font-mono">
            <div>
              <span className="text-slate-500">高度角: </span>
              <span className="text-yellow-400">{sunPos.altitude.toFixed(1)}°</span>
            </div>
            <div>
              <span className="text-slate-500">方位角: </span>
              <span className="text-cyan-400">{sunPos.azimuth.toFixed(1)}°</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            type="range"
            min={5}
            max={19}
            step={0.1}
            value={currentHour}
            onChange={(e) => {
              setIsPlaying(false);
              setCurrentHour(parseFloat(e.target.value));
            }}
            className="flex-1 h-1 bg-slate-700 rounded-none appearance-none cursor-pointer accent-blue-500"
          />
        </div>

        <div className="flex items-center justify-center gap-1 mb-3">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentHour((prev) => Math.max(5, prev - 1));
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-none border border-slate-600 transition-colors"
          >
            <SkipBack className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className={`p-2 rounded-none border transition-colors ${
              isPlaying
                ? 'bg-orange-600 border-orange-500 text-white hover:bg-orange-500'
                : 'bg-green-600 border-green-500 text-white hover:bg-green-500'
            }`}
          >
            {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </button>
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentHour((prev) => Math.min(19, prev + 1));
            }}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-none border border-slate-600 transition-colors"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-slate-500 text-[10px] mr-1">速度:</span>
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              onClick={() => setPlaybackSpeed(speed)}
              className={`flex-1 py-1 text-[10px] font-mono rounded-none border transition-colors ${
                playbackSpeed === speed
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-slate-800 border-slate-600 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {speed}x
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        <h4 className="text-slate-400 text-xs font-semibold mb-2">太阳轨迹示意</h4>
        <div className="relative h-32 bg-slate-950 border border-slate-700 rounded-none overflow-hidden">
          <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-slate-800 to-transparent" />
          <svg className="absolute inset-0 w-full h-full">
            <path
              d="M 10 90 Q 80 10, 150 90"
              fill="none"
              stroke="#334155"
              strokeWidth="1"
              strokeDasharray="2,2"
            />
            <circle
              cx={10 + (currentHour - 5) * 10}
              cy={90 - Math.sin(((currentHour - 5) / 14) * Math.PI) * 70}
              r={6}
              fill="#fbbf24"
            >
              <animate attributeName="r" values="6;8;6" dur="2s" repeatCount="indefinite" />
            </circle>
          </svg>
          <div className="absolute bottom-1 left-2 text-[9px] font-mono text-slate-500">05:00</div>
          <div className="absolute bottom-1 right-2 text-[9px] font-mono text-slate-500">19:00</div>
        </div>

        <div className="mt-4 p-2 bg-slate-800/50 border border-slate-700">
          <div className="text-[10px] text-slate-500 mb-1">图例</div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-none bg-blue-500" />
              <span className="text-[10px] text-slate-400">正常组件</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-none bg-yellow-500" />
              <span className="text-[10px] text-slate-400">中度遮挡</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-none bg-orange-500" />
              <span className="text-[10px] text-slate-400">高度遮挡</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-none bg-red-500" />
              <span className="text-[10px] text-slate-400">严重遮挡</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full border-2 border-purple-500 bg-transparent" />
              <span className="text-[10px] text-slate-400">方位角错误</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500/30 border border-dashed border-orange-500" />
              <span className="text-[10px] text-slate-400">缺字段组件</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-[10px] text-slate-400">有备注</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
