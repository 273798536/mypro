import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function TimeSlider() {
  const {
    timeSettings,
    setTime,
    setPlaying,
    setPlaySpeed
  } = useAppStore();

  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    if (timeSettings.isPlaying) {
      const animate = (currentTime: number) => {
        if (lastTimeRef.current === 0) {
          lastTimeRef.current = currentTime;
        }

        const delta = currentTime - lastTimeRef.current;
        
        if (delta > 50) {
          lastTimeRef.current = currentTime;
          
          const totalMinutes = timeSettings.hour * 60 + timeSettings.minute;
          const newTotalMinutes = totalMinutes + timeSettings.playSpeed;
          
          if (newTotalMinutes >= 1080) {
            setTime(18, 0);
            setPlaying(false);
          } else {
            const newHour = Math.floor(newTotalMinutes / 60);
            const newMinute = Math.floor(newTotalMinutes % 60);
            setTime(newHour, newMinute);
          }
        }

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [timeSettings.isPlaying, timeSettings.hour, timeSettings.minute, timeSettings.playSpeed, setTime, setPlaying]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const totalMinutes = parseInt(e.target.value);
    const hour = Math.floor(totalMinutes / 60);
    const minute = Math.floor(totalMinutes % 60);
    setTime(hour, minute);
  };

  const togglePlay = () => {
    if (!timeSettings.isPlaying && timeSettings.hour >= 18) {
      setTime(6, 0);
    }
    setPlaying(!timeSettings.isPlaying);
  };

  const skipToStart = () => {
    setTime(6, 0);
    setPlaying(false);
  };

  const skipToEnd = () => {
    setTime(18, 0);
    setPlaying(false);
  };

  const totalMinutes = timeSettings.hour * 60 + timeSettings.minute;
  const timeLabel = `${timeSettings.hour.toString().padStart(2, '0')}:${timeSettings.minute.toString().padStart(2, '0')}`;

  return (
    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-slate-900/95 to-slate-900/80 backdrop-blur-sm p-4 border-t border-slate-700">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={skipToStart}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              title="跳到日出"
            >
              <SkipBack size={18} className="text-slate-200" />
            </button>
            
            <button
              onClick={togglePlay}
              className="p-3 rounded-lg bg-blue-600 hover:bg-blue-500 transition-colors"
              title={timeSettings.isPlaying ? '暂停' : '播放'}
            >
              {timeSettings.isPlaying ? (
                <Pause size={20} className="text-white" />
              ) : (
                <Play size={20} className="text-white" />
              )}
            </button>

            <button
              onClick={skipToEnd}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors"
              title="跳到日落"
            >
              <SkipForward size={18} className="text-slate-200" />
            </button>
          </div>

          <div className="flex-1">
            <div className="relative">
              <input
                type="range"
                min="360"
                max="1080"
                value={totalMinutes}
                onChange={handleSliderChange}
                className="w-full h-2 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #fbbf24 0%, #3b82f6 50%, #8b5cf6 100%)`
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              <span>06:00 日出</span>
              <span>12:00 正午</span>
              <span>18:00 日落</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-2xl font-mono font-bold text-white">
              {timeLabel}
            </div>
            <div className="text-xs text-slate-400">当前时间</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">播放速度:</span>
            {[1, 2, 5, 10].map((speed) => (
              <button
                key={speed}
                onClick={() => setPlaySpeed(speed)}
                className={`px-2 py-1 text-xs rounded transition-colors ${
                  timeSettings.playSpeed === speed
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {speed}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
