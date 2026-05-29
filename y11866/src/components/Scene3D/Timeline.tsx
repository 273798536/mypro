import { useRef, useEffect, useCallback } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { COLORS } from '@/utils/colors';
import { formatTimestamp } from '@/utils/colors';

export function Timeline() {
  const {
    filters,
    timelinePosition,
    isPlaying,
    setTimelinePosition,
    setIsPlaying,
    applyFilterToTimeline,
  } = useAppStore();

  const animationRef = useRef<number | null>(null);
  const startTime = filters.timeRange[0];
  const endTime = filters.timeRange[1];
  const currentTime = startTime + (endTime - startTime) * timelinePosition;

  const animate = useCallback(() => {
    setTimelinePosition(prev => {
      if (prev >= 1) {
        setIsPlaying(false);
        return 1;
      }
      return Math.min(prev + 0.002, 1);
    });
    applyFilterToTimeline();
    animationRef.current = requestAnimationFrame(animate);
  }, [setTimelinePosition, setIsPlaying, applyFilterToTimeline]);

  useEffect(() => {
    if (isPlaying) {
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

  const handlePlayPause = () => {
    if (timelinePosition >= 1) {
      setTimelinePosition(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setTimelinePosition(0);
    setIsPlaying(false);
  };

  const handleSkipForward = () => {
    setTimelinePosition(1);
    setIsPlaying(false);
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setTimelinePosition(value);
    setIsPlaying(false);
    applyFilterToTimeline();
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 px-6 py-4"
         style={{
           background: 'linear-gradient(to top, rgba(10, 22, 40, 0.98), transparent)',
         }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-2">
          <div className="text-xs font-mono" style={{ color: COLORS.text.secondary }}>
            {formatTimestamp(startTime)}
          </div>
          <div className="flex-1 text-center">
            <span className="text-sm font-mono px-3 py-1 rounded"
                  style={{
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    border: `1px solid ${COLORS.panelBorder}`,
                    color: COLORS.text.primary,
                  }}>
              {formatTimestamp(currentTime)}
            </span>
          </div>
          <div className="text-xs font-mono" style={{ color: COLORS.text.secondary }}>
            {formatTimestamp(endTime)}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: COLORS.text.secondary }}
              title="重置"
            >
              <SkipBack size={18} />
            </button>
            <button
              onClick={handlePlayPause}
              className="p-3 rounded-full transition-all hover:scale-105"
              style={{
                backgroundColor: COLORS.node.selected,
                color: COLORS.background,
                boxShadow: `0 0 20px ${COLORS.node.selected}60`,
              }}
              title={isPlaying ? '暂停' : '播放'}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={handleSkipForward}
              className="p-2 rounded-lg transition-all hover:bg-white/10"
              style={{ color: COLORS.text.secondary }}
              title="跳转到最后"
            >
              <SkipForward size={18} />
            </button>
          </div>

          <div className="flex-1 relative">
            <div className="h-2 rounded-full overflow-hidden"
                 style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${timelinePosition * 100}%`,
                  background: `linear-gradient(to right, ${COLORS.node.selected}, ${COLORS.node.high})`,
                }}
              />
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.001"
              value={timelinePosition}
              onChange={handleSliderChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="text-xs font-mono px-3 py-1 rounded"
               style={{
                 backgroundColor: 'rgba(255,255,255,0.05)',
                 color: COLORS.text.secondary,
                 minWidth: '60px',
                 textAlign: 'center',
               }}>
            {Math.round(timelinePosition * 100)}%
          </div>
        </div>
      </div>
    </div>
  );
}

export default Timeline;
