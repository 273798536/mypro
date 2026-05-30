import { useCallback } from 'react';
import { Play, RotateCcw, Download, Upload, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import type { Streamline } from '@/types';
import { useVectorFieldStore } from '@/store/vectorFieldStore';
import { useDetectionStore } from '@/store/detectionStore';
import { useUIStore } from '@/store/uiStore';
import { exportToJson, importFromJson } from '@/utils/storage';
import { clsx } from '@/lib/utils';

export function ActionButtons() {
  const currentFormula = useVectorFieldStore((s) =>
    s.formulas.find((f) => f.id === s.currentFormulaId)
  );
  const seedPoints = useVectorFieldStore((s) => s.seedPoints);
  const colorScale = useVectorFieldStore((s) => s.colorScale);

  const currentResult = useDetectionStore((s) => s.currentResult);
  const runDetectionWithConsistencyCheck = useDetectionStore(
    (s) => s.runDetectionWithConsistencyCheck
  );
  const clearResult = useDetectionStore((s) => s.clearResult);
  const setCurrentResult = useDetectionStore((s) => s.setCurrentResult);

  const isLoading = useUIStore((s) => s.isLoading);
  const setLoading = useUIStore((s) => s.setLoading);
  const setLoadingProgress = useUIStore((s) => s.setLoadingProgress);
  const setErrorMessage = useUIStore((s) => s.setErrorMessage);

  const handleRunDetection = useCallback(async () => {
    if (!currentFormula) {
      setErrorMessage('请先选择一个向量场公式');
      return;
    }
    if (seedPoints.length === 0) {
      setErrorMessage('请先添加至少一个种子点');
      return;
    }

    setLoading(true, '正在准备检测...');
    setLoadingProgress(0);
    setErrorMessage(null);

    try {
      const result = await runDetectionWithConsistencyCheck(
        currentFormula,
        seedPoints,
        2,
        {
          maxSteps: 200,
          stepSize: 0.05,
        }
      );

      if (result && colorScale) {
        const affectedStreamlines: Streamline[] = result.streamlines.map((s) => ({
          ...s,
          colorAffected: true,
        }));
        setCurrentResult({
          ...result,
          streamlines: affectedStreamlines,
          hasColorScale: true,
        });
      }

      setLoadingProgress(100);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : '检测运行失败'
      );
    } finally {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    }
  }, [
    currentFormula,
    seedPoints,
    colorScale,
    runDetectionWithConsistencyCheck,
    setCurrentResult,
    setLoading,
    setLoadingProgress,
    setErrorMessage,
  ]);

  const handleClear = useCallback(() => {
    clearResult();
    setErrorMessage(null);
  }, [clearResult, setErrorMessage]);

  const handleExport = useCallback(() => {
    if (currentResult) {
      exportToJson(currentResult, `detection-result-${Date.now()}.json`);
    }
  }, [currentResult]);

  const handleImport = useCallback(async () => {
    const data = await importFromJson<typeof currentResult>();
    if (data && data.streamlines) {
      setCurrentResult(data);
    }
  }, [setCurrentResult]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleImport}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
          'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300',
          'border border-slate-700 hover:border-slate-600'
        )}
        title="导入检测结果"
      >
        <Upload size={16} />
        <span className="hidden sm:inline">导入</span>
      </button>

      <button
        onClick={handleExport}
        disabled={!currentResult}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
          'border border-slate-700',
          currentResult
            ? 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 hover:border-slate-600'
            : 'bg-slate-900/50 text-slate-600 cursor-not-allowed'
        )}
        title="导出检测结果"
      >
        <Download size={16} />
        <span className="hidden sm:inline">导出</span>
      </button>

      <div className="w-px h-6 bg-slate-700 mx-1" />

      <button
        onClick={handleClear}
        disabled={!currentResult || isLoading}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm transition-all',
          'border border-slate-700',
          currentResult && !isLoading
            ? 'bg-slate-800/80 hover:bg-red-500/10 text-slate-300 hover:border-red-500/50 hover:text-red-400'
            : 'bg-slate-900/50 text-slate-600 cursor-not-allowed'
        )}
        title="清空结果"
      >
        <RotateCcw size={16} />
        <span className="hidden sm:inline">清空</span>
      </button>

      <button
        onClick={handleRunDetection}
        disabled={isLoading}
        className={clsx(
          'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all',
          'border',
          isLoading
            ? 'bg-blue-600/50 border-blue-500/50 text-white/80 cursor-wait'
            : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 border-transparent text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30'
        )}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>运行中...</span>
          </>
        ) : (
          <>
            <Play size={16} />
            <span>运行检测</span>
          </>
        )}
      </button>

      {currentResult && (
        <div className="flex items-center gap-2 ml-2">
          {currentResult.isConsistent ? (
            <div className="flex items-center gap-1 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
              <CheckCircle size={12} />
              <span>可重复</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-xs text-red-400 bg-red-500/10 px-2 py-1 rounded-full">
              <AlertTriangle size={12} />
              <span>不一致</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
