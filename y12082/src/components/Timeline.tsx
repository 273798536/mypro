import { useEffect, useRef } from 'react';
import { Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

const Timeline = () => {
  const {
    timePoints,
    currentTimeIndex,
    setCurrentTimeIndex,
    isPlaying,
    setIsPlaying
  } = useAppStore();
  
  const intervalRef = useRef<number | null>(null);
  
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        const nextIndex = currentTimeIndex >= timePoints.length - 1 ? 0 : currentTimeIndex + 1;
        if (currentTimeIndex >= timePoints.length - 1) {
          setIsPlaying(false);
        }
        setCurrentTimeIndex(nextIndex);
      }, 2000);
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
  }, [isPlaying, currentTimeIndex, timePoints.length, setCurrentTimeIndex, setIsPlaying]);
  
  const formatDate = (date: Date) => {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };
  
  return (
    <div className="bg-slate-900/95 backdrop-blur border-t border-slate-700 text-white px-4 py-3">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-blue-400" />
          <span className="font-semibold text-sm">时间轴</span>
        </div>
        
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTimeIndex(Math.max(0, currentTimeIndex - 1));
            }}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            disabled={currentTimeIndex === 0}
          >
            <SkipBack className="w-4 h-4" />
          </button>
          
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-2 rounded bg-blue-600 hover:bg-blue-700 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Play className="w-4 h-4" />
            )}
          </button>
          
          <button
            onClick={() => {
              setIsPlaying(false);
              setCurrentTimeIndex(Math.min(timePoints.length - 1, currentTimeIndex + 1));
            }}
            className="p-1.5 rounded hover:bg-slate-700 transition-colors"
            disabled={currentTimeIndex === timePoints.length - 1}
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>
        
        <div className="flex-1">
          <div className="relative">
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-700 -translate-y-1/2 rounded-full">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{
                  width: `${(currentTimeIndex / (timePoints.length - 1)) * 100}%`
                }}
              />
            </div>
            
            <div className="relative flex justify-between">
              {timePoints.map((point, index) => (
                <button
                  key={point.id}
                  onClick={() => {
                    setIsPlaying(false);
                    setCurrentTimeIndex(index);
                  }}
                  className={`
                    relative w-4 h-4 rounded-full border-2 transition-all
                    ${index <= currentTimeIndex
                      ? 'bg-blue-500 border-blue-400'
                      : 'bg-slate-700 border-slate-600 hover:border-slate-500'
                    }
                  `}
                >
                  <div className={`
                    absolute bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap
                    px-2 py-1 rounded text-xs font-medium
                    ${index === currentTimeIndex
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-400'
                    }
                  `}>
                    <p>{point.name}</p>
                    <p className="opacity-70">{formatDate(point.timestamp)}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
        
        <div className="text-sm">
          <span className="text-slate-400">当前: </span>
          <span className="font-medium text-blue-400">
            {timePoints[currentTimeIndex]?.name}
          </span>
          <span className="text-slate-500 text-xs ml-2">
            {timePoints[currentTimeIndex]?.description}
          </span>
        </div>
      </div>
    </div>
  );
};

export default Timeline;
