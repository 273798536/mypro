import { useCallback, useEffect, useState } from 'react';
import {
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  Hash,
  Zap,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { useUIStore } from '@/store/uiStore';
import { useDetectionStore } from '@/store/detectionStore';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { useStreamlineStats } from '@/hooks/useStreamline';
import { clsx } from '@/lib/utils';

export function StatusBar() {
  const isLoading = useUIStore((s) => s.isLoading);
  const loadingProgress = useUIStore((s) => s.loadingProgress);
  const errorMessage = useUIStore((s) => s.errorMessage);
  const setErrorMessage = useUIStore((s) => s.setErrorMessage);

  const currentResult = useDetectionStore((s) => s.currentResult);
  const currentFormula = useVectorFieldStore((s) =>
    s.formulas.find((f) => f.id === s.currentFormulaId)
  );
  const seedPoints = useVectorFieldStore((s) => s.seedPoints);
  const filterConditions = useVectorFieldStore((s) => s.filterConditions);

  const stats = useStreamlineStats(currentResult?.streamlines || []);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleDismissError = useCallback(() => {
    setErrorMessage(null);
  }, [setErrorMessage]);

  return (
    <footer className="h-8 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 flex items-center justify-between px-4 text-[11px] z-40 relative">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-slate-500">
          <Clock size={12} />
          <span className="font-mono">
            {currentTime.toLocaleTimeString()}
          </span>
        </div>

        {currentFormula && (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Activity size={12} />
            <span>
              公式: <span className="text-slate-300">{currentFormula.name}</span>
            </span>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-slate-500">
          <Hash size={12} />
          <span>
            种子点: <span className="text-slate-300 font-mono">{seedPoints.length}</span>
          </span>
        </div>

        {currentResult && (
          <>
            <div className="w-px h-4 bg-slate-700" />

            <div className="flex items-center gap-1.5 text-slate-500">
              <Zap size={12} />
              <span>
                流线: <span className="text-slate-300 font-mono">{stats.totalStreamlines}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <span>
                数据点: <span className="text-slate-300 font-mono">{stats.totalPoints}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <span>
                均速: <span className="text-cyan-400 font-mono">{stats.avgSpeed.toFixed(4)}</span>
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-500">
              <span>
                最大速度: <span className="text-yellow-400 font-mono">{stats.maxSpeed.toFixed(4)}</span>
              </span>
            </div>

            {currentResult.runHash && (
              <div className="flex items-center gap-1.5 text-slate-600">
                <span className="font-mono text-[10px]">
                  Hash: {currentResult.runHash.slice(0, 8)}
                </span>
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-4">
        {filterConditions.showOnlyAnomalies && (
          <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-[10px]">
            仅显示异常
          </span>
        )}

        {currentResult && (
          <div
            className={clsx(
              'flex items-center gap-1.5 px-2 py-0.5 rounded-full',
              currentResult.isConsistent
                ? 'bg-green-500/20 text-green-400'
                : 'bg-red-500/20 text-red-400'
            )}
          >
            {currentResult.isConsistent ? (
              <CheckCircle size={12} />
            ) : (
              <XCircle size={12} />
            )}
            <span className="font-medium">
              {currentResult.isConsistent ? '可重复性验证通过' : '结果不一致!'}
            </span>
            <span className="text-[10px] opacity-75">
              第{currentResult.runNumber}次
            </span>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center gap-2">
            <Loader2 size={12} className="animate-spin text-blue-400" />
            <span className="text-blue-400">处理中...</span>
            {loadingProgress > 0 && (
              <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
            )}
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 px-2 py-1 bg-red-500/20 text-red-400 rounded-lg border border-red-500/30">
            <AlertCircle size={12} />
            <span className="max-w-xs truncate">{errorMessage}</span>
            <button
              onClick={handleDismissError}
              className="ml-1 hover:text-red-300"
            >
              <XCircle size={12} />
            </button>
          </div>
        )}
      </div>
    </footer>
  );
}
