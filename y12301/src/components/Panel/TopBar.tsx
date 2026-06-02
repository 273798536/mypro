import { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, Wind, RefreshCw, Download, Upload } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { TIME_PERIODS, TimePeriod } from '../../types';
import { cn } from '../../utils/cn';
import { ImportModal } from './ImportModal';

export function TopBar() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const timePeriod = useAppStore((state) => state.timePeriod);
  const setTimePeriod = useAppStore((state) => state.setTimePeriod);
  const isPlaying = useAppStore((state) => state.isPlaying);
  const setIsPlaying = useAppStore((state) => state.setIsPlaying);
  const runAnomalyDetection = useAppStore((state) => state.runAnomalyDetection);
  const anomalies = useAppStore((state) => state.anomalies);
  const exportReport = useAppStore((state) => state.exportReport);

  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (isPlaying) {
      let currentIndex = TIME_PERIODS.findIndex((p) => p.key === timePeriod);
      const animate = () => {
        currentIndex = (currentIndex + 1) % TIME_PERIODS.length;
        setTimePeriod(TIME_PERIODS[currentIndex].key);
        animationRef.current = window.setTimeout(animate, 3000);
      };
      animationRef.current = window.setTimeout(animate, 3000);
    } else {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        clearTimeout(animationRef.current);
      }
    };
  }, [isPlaying, setTimePeriod]);

  const currentIndex = TIME_PERIODS.findIndex((p) => p.key === timePeriod);

  const handlePrev = () => {
    const newIndex = (currentIndex - 1 + TIME_PERIODS.length) % TIME_PERIODS.length;
    setTimePeriod(TIME_PERIODS[newIndex].key);
  };

  const handleNext = () => {
    const newIndex = (currentIndex + 1) % TIME_PERIODS.length;
    setTimePeriod(TIME_PERIODS[newIndex].key);
  };

  const errorCount = anomalies.filter((a) => !a.resolved && a.severity === 'error').length;
  const warningCount = anomalies.filter((a) => !a.resolved && a.severity === 'warning').length;

  return (
    <>
      <div className="h-14 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 flex items-center px-4 gap-6">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
          <Wind className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-white">城市风廊分析系统</h1>
          <p className="text-xs text-slate-400">Wind Corridor Analyzer</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center gap-4">
        <button
          onClick={handlePrev}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="上一时段"
        >
          <SkipBack className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
          {TIME_PERIODS.map((period, index) => (
            <button
              key={period.key}
              onClick={() => setTimePeriod(period.key)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs transition-all duration-200',
                timePeriod === period.key
                  ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              )}
            >
              {period.label.split(' ')[0]}
            </button>
          ))}
        </div>

        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={cn(
            'p-2 rounded-lg transition-all duration-200',
            isPlaying
              ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/30'
              : 'hover:bg-slate-800 text-slate-400 hover:text-white'
          )}
          title={isPlaying ? '暂停' : '播放'}
        >
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </button>

        <button
          onClick={handleNext}
          className="p-2 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          title="下一时段"
        >
          <SkipForward className="w-4 h-4" />
        </button>

        <div className="h-6 w-px bg-slate-700 mx-2" />

        <div className="text-sm">
          <span className="text-slate-400">当前时段: </span>
          <span className="text-cyan-400 font-medium">{TIME_PERIODS[currentIndex].label}</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            <span className="text-xs text-slate-400">
              异常 <span className="text-red-400 font-medium">{errorCount}</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-xs text-slate-400">
              警告 <span className="text-amber-400 font-medium">{warningCount}</span>
            </span>
          </div>
        </div>

        <div className="h-6 w-px bg-slate-700" />

        <button
          onClick={runAnomalyDetection}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors text-xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          重新检测
        </button>

        <button
          onClick={exportReport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-600 text-white transition-colors text-xs shadow-lg shadow-cyan-500/30"
        >
          <Download className="w-3.5 h-3.5" />
          导出报告
        </button>

        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white transition-colors text-xs"
        >
          <Upload className="w-3.5 h-3.5" />
          导入数据
        </button>
      </div>
    </div>

    <ImportModal isOpen={importModalOpen} onClose={() => setImportModalOpen(false)} />
    </>
  );
}
