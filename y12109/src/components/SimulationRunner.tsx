import { useSimulationStore } from '@/store/useSimulationStore';
import { Play, Loader2, RotateCcw, AlertCircle } from 'lucide-react';

export default function SimulationRunner() {
  const { isRunning, progress, error, result, policies, runSim, reset } = useSimulationStore();

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">模拟运行</h2>
        {result && !isRunning && (
          <button
            onClick={reset}
            className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            重置
          </button>
        )}
      </div>

      <button
        onClick={runSim}
        disabled={isRunning || policies.length === 0}
        className={`w-full py-3 rounded-lg font-medium text-sm transition-all flex items-center justify-center gap-2 ${
          isRunning
            ? 'bg-surface-200 text-gray-500 cursor-wait'
            : policies.length === 0
            ? 'bg-surface-200 text-gray-600 cursor-not-allowed'
            : 'bg-accent hover:bg-accent-dark text-white shadow-lg shadow-accent/20 hover:shadow-accent/30'
        }`}
      >
        {isRunning ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            模拟中... {progress.toFixed(0)}%
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            运行蒙特卡洛模拟
          </>
        )}
      </button>

      {isRunning && (
        <div className="w-full bg-surface-200 rounded-full h-1.5 overflow-hidden">
          <div
            className="h-full bg-accent rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {error && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20">
          <AlertCircle className="w-4 h-4 text-danger mt-0.5 flex-shrink-0" />
          <div className="text-xs text-danger-light">{error}</div>
        </div>
      )}

      {policies.length === 0 && !isRunning && (
        <div className="text-xs text-gray-600 text-center py-2">请先导入保单样本</div>
      )}
    </div>
  );
}
