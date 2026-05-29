import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, SkipBack, SkipForward, History } from 'lucide-react';
import type { Operation } from '@/types';

interface ReplayTimelineProps {
  operations: Operation[];
}

export default function ReplayTimeline({ operations }: ReplayTimelineProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentOperation = operations[currentIndex];

  const goToPrev = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  const goToNext = useCallback(() => {
    setCurrentIndex(prev => {
      if (prev >= operations.length - 1) {
        setIsPlaying(false);
        return prev;
      }
      return prev + 1;
    });
  }, [operations.length]);

  const togglePlay = () => {
    setIsPlaying(prev => !prev);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        goToNext();
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, goToNext]);

  useEffect(() => {
    if (currentIndex >= operations.length - 1) {
      setIsPlaying(false);
    }
  }, [currentIndex, operations.length]);

  const operationTypeLabels: Record<string, string> = {
    drag: '债券拖拽',
    curve_adjust: '曲线调整',
    cashflow_estimate: '现金流权重',
  };

  return (
    <div className="bg-slate-800 rounded-xl p-6 border border-slate-700">
      <h3 className="font-bold text-lg text-slate-200 mb-4 flex items-center gap-2">
        <History className="w-5 h-5 text-violet-400" />
        操作回放
        <span className="text-sm font-normal text-slate-400 ml-auto">
          {currentIndex + 1} / {operations.length}
        </span>
      </h3>

      {operations.length > 0 && (
        <>
          <div className="bg-slate-700/50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-slate-400">操作类型</span>
              <span className="text-amber-400 font-medium">
                {operationTypeLabels[currentOperation?.type] || currentOperation?.type}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm mb-3">
              <span className="text-slate-400">操作时间</span>
              <span className="text-slate-200">
                {currentOperation && new Date(currentOperation.timestamp).toLocaleTimeString('zh-CN')}
              </span>
            </div>
            {currentOperation?.detail?.scoreDelta !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">得分变化</span>
                <span className={`font-medium ${
                  (currentOperation.detail.scoreDelta as number) > 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                }`}>
                  {(currentOperation.detail.scoreDelta as number) > 0 ? '+' : ''}
                  {currentOperation.detail.scoreDelta as number}
                </span>
              </div>
            )}
            {currentOperation?.detail?.correct !== undefined && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400">是否正确</span>
                <span className={currentOperation.detail.correct ? 'text-emerald-400' : 'text-rose-400'}>
                  {currentOperation.detail.correct ? '✓ 正确' : '✗ 错误'}
                </span>
              </div>
            )}
          </div>

          <div className="relative h-2 bg-slate-700 rounded-full mb-4">
            <motion.div
              className="absolute left-0 top-0 h-full bg-violet-500 rounded-full"
              style={{ width: `${((currentIndex + 1) / operations.length) * 100}%` }}
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / operations.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
            <input
              type="range"
              min={0}
              max={operations.length - 1}
              value={currentIndex}
              onChange={e => setCurrentIndex(Number(e.target.value))}
              className="absolute inset-0 w-full opacity-0 cursor-pointer"
            />
          </div>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={goToPrev}
              disabled={currentIndex === 0}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipBack className="w-5 h-5 text-slate-300" />
            </button>
            <button
              onClick={togglePlay}
              className="p-3 rounded-full bg-violet-500 hover:bg-violet-400 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-6 h-6 text-white" />
              ) : (
                <Play className="w-6 h-6 text-white" />
              )}
            </button>
            <button
              onClick={goToNext}
              disabled={currentIndex === operations.length - 1}
              className="p-2 rounded-lg bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <SkipForward className="w-5 h-5 text-slate-300" />
            </button>
          </div>

          <div className="mt-4 flex gap-1">
            {operations.map((op, i) => (
              <div
                key={i}
                className={`flex-1 h-1 rounded-full transition-colors ${
                  i <= currentIndex ? 'bg-violet-500' : 'bg-slate-600'
                }`}
              />
            ))}
          </div>
        </>
      )}

      {operations.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          暂无操作记录
        </div>
      )}
    </div>
  );
}
