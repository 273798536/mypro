import { useEffect, useRef } from 'react';
import { Play, Pause, ChevronLeft, ChevronRight } from 'lucide-react';
import { useDataStore } from '../../store/useDataStore';
import dayjs from 'dayjs';

export function TimeSlider() {
  const {
    currentDate,
    dateRange,
    tradeCalendar,
    isPlaying,
    setCurrentDate,
    setIsPlaying,
    riskAlerts,
  } = useDataStore();

  const intervalRef = useRef<number | null>(null);

  const tradingDays = tradeCalendar.filter(d => d.isTradingDay);
  const currentIndex = tradingDays.findIndex(d => d.tradeDate === currentDate);
  const minIndex = 0;
  const maxIndex = tradingDays.length - 1;

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        const idx = tradingDays.findIndex(d => d.tradeDate === currentDate);
        const nextIdx = idx < maxIndex ? idx + 1 : minIndex;
        setCurrentDate(tradingDays[nextIdx].tradeDate);
      }, 1500);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, maxIndex, minIndex, setCurrentDate, tradingDays, currentDate]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value);
    setCurrentDate(tradingDays[index].tradeDate);
  };

  const handlePrev = () => {
    const prevIndex = Math.max(currentIndex - 1, minIndex);
    setCurrentDate(tradingDays[prevIndex].tradeDate);
  };

  const handleNext = () => {
    const nextIndex = Math.min(currentIndex + 1, maxIndex);
    setCurrentDate(tradingDays[nextIndex].tradeDate);
  };

  const riskDates = [...new Set(riskAlerts.map(r => dayjs(r.detectedAt).format('YYYY-MM-DD')))];

  return (
    <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-[700px] z-10">
      <div className="bg-slate-900/90 backdrop-blur-xl rounded-2xl p-5 border border-slate-700/50 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-sm">交易日</span>
            <span className="text-2xl font-bold text-cyan-400 font-mono">
              {dayjs(currentDate).format('YYYY-MM-DD')}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrev}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-3 rounded-full transition-all ${
                isPlaying
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-cyan-500 hover:bg-cyan-600 text-white'
              }`}
            >
              {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            </button>
            <button
              onClick={handleNext}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div className="relative">
          <input
            type="range"
            min={minIndex}
            max={maxIndex}
            value={currentIndex}
            onChange={handleSliderChange}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-cyan-400
              [&::-webkit-slider-thumb]:shadow-lg
              [&::-webkit-slider-thumb]:shadow-cyan-400/50
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:transition-transform
              [&::-webkit-slider-thumb]:hover:scale-110"
          />
          <div className="flex justify-between mt-2">
            {tradingDays.map((day, i) => (
              <div
                key={day.tradeDate}
                className="relative"
              >
                {riskDates.includes(day.tradeDate) && (
                  <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
                <span
                  className={`text-xs ${
                    i === currentIndex ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                >
                  {dayjs(day.tradeDate).format('MM/DD')}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
