import { useEffect, useRef, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { ANOMALY_COLORS } from '../../types';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';

export function Timeline() {
  const selectedMonth = useAppStore(state => state.selectedMonth);
  const setSelectedMonth = useAppStore(state => state.setSelectedMonth);
  const isPlaying = useAppStore(state => state.isPlaying);
  const setIsPlaying = useAppStore(state => state.setIsPlaying);
  const getAvailableMonths = useAppStore(state => state.getAvailableMonths);
  const anomalies = useAppStore(state => state.anomalies);

  const months = getAvailableMonths();
  const currentIndex = months.indexOf(selectedMonth);
  const playIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const anomalyMarkers = useMemo(() => {
    const markers: { month: string; types: string[] }[] = [];
    months.forEach(month => {
      const monthAnomalies = anomalies.filter(a => a.month === month && !a.resolved);
      if (monthAnomalies.length > 0) {
        markers.push({
          month,
          types: [...new Set(monthAnomalies.map(a => a.type))]
        });
      }
    });
    return markers;
  }, [months, anomalies]);

  useEffect(() => {
    if (isPlaying) {
      playIntervalRef.current = setInterval(() => {
        const currentIdx = months.indexOf(selectedMonth);
        if (currentIdx < months.length - 1) {
          setSelectedMonth(months[currentIdx + 1]);
        } else {
          setIsPlaying(false);
        }
      }, 1000);
    } else {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    }

    return () => {
      if (playIntervalRef.current) {
        clearInterval(playIntervalRef.current);
      }
    };
  }, [isPlaying, selectedMonth, months, setSelectedMonth, setIsPlaying]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const index = parseInt(e.target.value, 10);
    setSelectedMonth(months[index]);
    if (isPlaying) {
      setIsPlaying(false);
    }
  };

  const handlePlayPause = () => {
    if (currentIndex === months.length - 1) {
      setSelectedMonth(months[0]);
    }
    setIsPlaying(!isPlaying);
  };

  const handleSkipBack = () => {
    if (currentIndex > 0) {
      setSelectedMonth(months[currentIndex - 1]);
    }
    if (isPlaying) setIsPlaying(false);
  };

  const handleSkipForward = () => {
    if (currentIndex < months.length - 1) {
      setSelectedMonth(months[currentIndex + 1]);
    }
    if (isPlaying) setIsPlaying(false);
  };

  const getAnomalyColor = (types: string[]) => {
    if (types.includes('missing_month')) return ANOMALY_COLORS.missing_month;
    if (types.includes('score_anomaly')) return ANOMALY_COLORS.score_anomaly;
    return ANOMALY_COLORS.region_overlap;
  };

  return (
    <div className="bg-[#0a1628]/90 backdrop-blur-md border-t border-[#1e3a5f] px-6 py-4">
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <button
            onClick={handleSkipBack}
            disabled={currentIndex === 0}
            className="p-2 rounded hover:bg-[#1e3a5f] text-[#6b8bb0] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipBack size={16} />
          </button>
          <button
            onClick={handlePlayPause}
            className="p-3 rounded-full bg-[#1e3a5f] text-white hover:bg-[#2a4a7f] transition-all"
          >
            {isPlaying ? <Pause size={18} /> : <Play size={18} className="ml-0.5" />}
          </button>
          <button
            onClick={handleSkipForward}
            disabled={currentIndex === months.length - 1}
            className="p-2 rounded hover:bg-[#1e3a5f] text-[#6b8bb0] hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipForward size={16} />
          </button>
        </div>

        <div className="text-center min-w-[100px]">
          <div className="text-2xl font-bold text-white" style={{ fontFamily: 'Space Grotesk, sans-serif' }}>
            {selectedMonth}
          </div>
          <div className="text-[10px] text-[#6b8bb0]">
            {currentIndex + 1} / {months.length}
          </div>
        </div>

        <div className="flex-1 relative">
          <div className="relative h-8 flex items-center">
            <input
              type="range"
              min="0"
              max={months.length - 1}
              value={currentIndex}
              onChange={handleSliderChange}
              className="w-full h-1.5 bg-[#1e3a5f] rounded-full appearance-none cursor-pointer z-10 relative"
              style={{
                background: `linear-gradient(to right, #3a6ea5 0%, #3a6ea5 ${(currentIndex / (months.length - 1)) * 100}%, #1e3a5f ${(currentIndex / (months.length - 1)) * 100}%, #1e3a5f 100%)`
              }}
            />
            <div className="absolute inset-x-0 flex justify-between pointer-events-none">
              {months.map((month, idx) => {
                const anomaly = anomalyMarkers.find(a => a.month === month);
                return (
                  <div
                    key={month}
                    className="relative flex flex-col items-center"
                    style={{ width: `${100 / months.length}%` }}
                  >
                    {anomaly && (
                      <div
                        className="absolute -top-1 w-2 h-2 rounded-full animate-pulse"
                        style={{ backgroundColor: getAnomalyColor(anomaly.types) }}
                        title={`${month} 存在${anomaly.types.length}项异常`}
                      />
                    )}
                    <div
                      className={`w-0.5 h-2 ${idx === currentIndex ? 'bg-[#3a6ea5]' : 'bg-[#2a4a7f]'}`}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex justify-between mt-1">
            {months.map((month, idx) => (
              <div
                key={month}
                className={`text-[9px] font-mono ${
                  idx === currentIndex ? 'text-white' : 'text-[#4a6a90]'
                }`}
                style={{ width: `${100 / months.length}%`, textAlign: 'center' }}
              >
                {idx % 2 === 0 ? month.slice(5) : ''}
              </div>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-[#6b8bb0]">异常标记:</span>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ANOMALY_COLORS.missing_month }} />
            <span className="text-[#8ba3c7]">缺月</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ANOMALY_COLORS.region_overlap }} />
            <span className="text-[#8ba3c7]">重叠</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: ANOMALY_COLORS.score_anomaly }} />
            <span className="text-[#8ba3c7]">得分</span>
          </div>
        </div>
      </div>
    </div>
  );
}
