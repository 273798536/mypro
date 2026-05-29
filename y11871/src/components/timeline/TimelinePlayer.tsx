import { useRef, useCallback, useMemo } from 'react';
import { Play, Pause, RotateCcw, Gauge, Clock } from 'lucide-react';
import { useTimeline } from '../../hooks/useTimeline';
import { useAllPressures } from '../../store/useParkingStore';
import { formatHour, pressureToColor, getPressureLabel } from '../../utils/colorUtils';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';

export function TimelinePlayer() {
  const {
    currentHour,
    isPlaying,
    playbackSpeed,
    minHour,
    maxHour,
    setCurrentHour,
    togglePlay,
    resetTimeline,
    setPlaybackSpeed,
  } = useTimeline();

  const allPressures = useAllPressures();
  const sliderRef = useRef<HTMLDivElement>(null);

  const handleSliderClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const hour = minHour + percentage * (maxHour - minHour);
    setCurrentHour(hour);
  }, [minHour, maxHour, setCurrentHour]);

  const handleSliderDrag = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.buttons !== 1) return;
    handleSliderClick(e);
  }, [handleSliderClick]);

  const pressureAtCurrentHour = useMemo(() => {
    const index = Math.floor(currentHour);
    return allPressures[index] || 0;
  }, [currentHour, allPressures]);

  const speedOptions = [0.5, 1, 2, 4];

  const waveformData = useMemo(() => {
    if (allPressures.length === 0) return Array(24).fill(0);
    return allPressures;
  }, [allPressures]);

  const currentProgress = (currentHour - minHour) / (maxHour - minHour);

  return (
    <div className="w-full bg-parking-panel backdrop-blur-xl border-t border-parking-border px-6 py-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <Button
            variant={isPlaying ? 'danger' : 'success'}
            size="icon"
            onClick={togglePlay}
            className="w-12 h-12 rounded-full"
          >
            {isPlaying ? <Pause size={24} /> : <Play size={24} className="ml-0.5" />}
          </Button>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={resetTimeline}
            className="w-10 h-10 rounded-full"
          >
            <RotateCcw size={18} />
          </Button>
        </div>

        <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-xl border border-parking-border">
          <Clock size={18} className="text-cyan-400" />
          <span className="font-display text-2xl font-bold text-cyan-300 min-w-[80px] tabular-nums">
            {formatHour(currentHour)}
          </span>
          <Badge 
            variant={
              pressureAtCurrentHour < 0.25 ? 'success' :
              pressureAtCurrentHour < 0.5 ? 'warning' :
              pressureAtCurrentHour < 0.75 ? 'danger' : 'critical'
            }
          >
            {getPressureLabel(pressureAtCurrentHour)}
          </Badge>
        </div>

        <div className="flex-1">
          <div
            ref={sliderRef}
            className="relative h-16 bg-slate-900/60 rounded-xl cursor-pointer overflow-hidden border border-parking-border group"
            onClick={handleSliderClick}
            onMouseMove={handleSliderDrag}
          >
            <div className="absolute inset-0 flex items-end px-1 pb-2">
              {waveformData.map((pressure, i) => (
                <div
                  key={i}
                  className="flex-1 mx-px rounded-t transition-all duration-300"
                  style={{
                    height: `${Math.max(4, pressure * 80)}%`,
                    backgroundColor: pressureToColor(pressure, 0.7),
                    opacity: i <= currentHour ? 1 : 0.3,
                  }}
                />
              ))}
            </div>

            <div className="absolute bottom-0 left-0 right-0 h-6 flex items-center justify-between px-2">
              {Array.from({ length: 9 }, (_, i) => {
                const hour = i * 3;
                return (
                  <span
                    key={hour}
                    className="text-[10px] text-slate-500 font-mono"
                  >
                    {hour.toString().padStart(2, '0')}
                  </span>
                );
              })}
            </div>

            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-400 shadow-lg shadow-cyan-400/50 transition-all duration-75 z-10"
              style={{ left: `${currentProgress * 100}%` }}
            >
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse" />
            </div>

            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-cyan-500/20 to-transparent pointer-events-none"
              style={{ width: `${currentProgress * 100}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Gauge size={16} className="text-slate-400" />
          <div className="flex gap-1">
            {speedOptions.map((speed) => (
              <Button
                key={speed}
                variant={playbackSpeed === speed ? 'primary' : 'ghost'}
                size="sm"
                onClick={() => setPlaybackSpeed(speed)}
                active={playbackSpeed === speed}
                className="px-2 min-w-[40px]"
              >
                {speed}x
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <span>点击或拖拽时间轴定位到任意时刻</span>
        </div>
        <div className="flex items-center gap-2">
          <span>压力图例：</span>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-emerald-500" />
            <span>低</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-amber-500" />
            <span>中</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-orange-500" />
            <span>高</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-600" />
            <span>极高</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-sm bg-red-900" />
            <span>饱和</span>
          </div>
        </div>
      </div>
    </div>
  );
}
