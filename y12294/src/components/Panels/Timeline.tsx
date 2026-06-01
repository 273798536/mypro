import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, ThermometerSun } from 'lucide-react';
import { timelinePoints } from '../../data/mockData';
import { useStore } from '../../store/useStore';

export function Timeline() {
  const {
    currentTimeIndex,
    isPlaying,
    showHeatMap,
    setCurrentTimeIndex,
    setIsPlaying,
    setShowHeatMap,
  } = useStore();

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = window.setInterval(() => {
        setCurrentTimeIndex((prev) => (prev >= timelinePoints.length - 1 ? 0 : prev + 1));
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
  }, [isPlaying, setCurrentTimeIndex]);

  const handlePointClick = (index: number) => {
    setCurrentTimeIndex(index);
    setIsPlaying(false);
  };

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="absolute bottom-0 left-0 right-0 z-10 px-4 pb-4"
    >
      <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700/50 rounded-xl p-4 shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentTimeIndex(Math.max(0, currentTimeIndex - 1))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <SkipBack size={16} />
            </button>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`p-3 rounded-lg transition-all ${
                isPlaying
                  ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              {isPlaying ? <Pause size={18} /> : <Play size={18} />}
            </button>
            <button
              onClick={() => setCurrentTimeIndex(Math.min(timelinePoints.length - 1, currentTimeIndex + 1))}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
            >
              <SkipForward size={16} />
            </button>
            <div className="ml-3">
              <div className="text-lg font-mono text-cyan-400">
                {timelinePoints[currentTimeIndex]?.time}
              </div>
              <div className="text-xs text-slate-500">
                {timelinePoints[currentTimeIndex]?.label}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowHeatMap(!showHeatMap)}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                showHeatMap
                  ? 'bg-cyan-950/50 text-cyan-400 border border-cyan-500/30'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              <ThermometerSun size={16} />
              <span>温场图</span>
            </button>
          </div>
        </div>

        <div className="relative h-12">
          <div className="absolute top-1/2 left-0 right-0 h-1 bg-slate-700 rounded-full -translate-y-1/2">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full"
              initial={false}
              animate={{
                width: `${(currentTimeIndex / (timelinePoints.length - 1)) * 100}%`,
              }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <div className="absolute top-1/2 left-0 right-0 flex justify-between -translate-y-1/2 px-0">
            {timelinePoints.map((point, index) => (
              <button
                key={index}
                onClick={() => handlePointClick(index)}
                className="relative group"
              >
                <div
                  className={`w-4 h-4 rounded-full transition-all duration-300 ${
                    index <= currentTimeIndex
                      ? point.isEvent
                        ? 'bg-red-500 shadow-lg shadow-red-500/50'
                        : 'bg-cyan-500 shadow-lg shadow-cyan-500/30'
                      : 'bg-slate-600'
                  } ${
                    index === currentTimeIndex ? 'scale-150 ring-4 ring-white/20' : ''
                  } hover:scale-125`}
                />
                <div
                  className={`absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] transition-opacity ${
                    index === currentTimeIndex ? 'text-cyan-400' : 'text-slate-500'
                  }`}
                >
                  {point.time}
                </div>
                {point.isEvent && (
                  <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                )}
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-300 text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                  {point.label}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-2 border-t border-slate-700/50">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span>图例:</span>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span>异常事件</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-full bg-cyan-500" />
              <span>正常节点</span>
            </div>
          </div>
          <div className="text-xs text-slate-500">
            拖拽或点击时间轴节点查看历史数据
          </div>
        </div>
      </div>
    </motion.div>
  );
}
