import { useEffect } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { useRiskStore } from '../../store/useRiskStore';

export const Timeline = () => {
  const timeFrames = useRiskStore((state) => state.timeFrames);
  const currentTimeIndex = useRiskStore((state) => state.currentTimeIndex);
  const isPlaying = useRiskStore((state) => state.isPlaying);
  const setCurrentTimeIndex = useRiskStore((state) => state.setCurrentTimeIndex);
  const togglePlaying = useRiskStore((state) => state.togglePlaying);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeIndex((currentTimeIndex + 1) % timeFrames.length);
      }, 2000);
    }

    return () => clearInterval(interval);
  }, [isPlaying, currentTimeIndex, timeFrames.length, setCurrentTimeIndex]);

  const handlePrev = () => {
    setCurrentTimeIndex((currentTimeIndex - 1 + timeFrames.length) % timeFrames.length);
  };

  const handleNext = () => {
    setCurrentTimeIndex((currentTimeIndex + 1) % timeFrames.length);
  };

  return (
    <div className="absolute bottom-0 left-0 right-0 h-20 panel border-t border-border-glow flex items-center px-6">
      <div className="flex items-center gap-2 mr-6">
        <Clock className="text-accent-blue" size={18} />
        <span className="text-sm font-semibold text-text-primary font-mono">时间轴</span>
      </div>

      <div className="flex items-center gap-2 mr-6">
        <button
          onClick={handlePrev}
          className="w-8 h-8 flex items-center justify-center rounded bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <SkipBack size={16} />
        </button>
        <button
          onClick={togglePlaying}
          className="w-10 h-10 flex items-center justify-center rounded-full bg-accent-blue text-bg-primary hover:shadow-glow transition-all"
        >
          {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
        </button>
        <button
          onClick={handleNext}
          className="w-8 h-8 flex items-center justify-center rounded bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary transition-colors"
        >
          <SkipForward size={16} />
        </button>
      </div>

      <div className="flex-1">
        <div className="flex justify-between mb-2">
          {timeFrames.map((frame, index) => (
            <button
              key={frame.timestamp}
              onClick={() => setCurrentTimeIndex(index)}
              className={`text-xs transition-colors ${
                index === currentTimeIndex
                  ? 'text-accent-blue font-semibold'
                  : 'text-text-muted hover:text-text-secondary'
              }`}
            >
              {frame.label}
            </button>
          ))}
        </div>
        <div className="relative h-2 bg-bg-tertiary rounded-full overflow-hidden">
          <div
            className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-blue to-accent-cyan rounded-full transition-all duration-500"
            style={{
              width: `${((currentTimeIndex + 1) / timeFrames.length) * 100}%`,
            }}
          />
          <div className="absolute inset-0 flex justify-between px-0">
            {timeFrames.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full -ml-1 transition-colors ${
                  index <= currentTimeIndex ? 'bg-accent-blue' : 'bg-bg-secondary'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="ml-6 text-sm text-text-muted">
        当前: <span className="text-accent-blue font-semibold">{timeFrames[currentTimeIndex]?.label}</span>
      </div>
    </div>
  );
};
