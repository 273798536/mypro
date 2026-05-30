import { useExperimentStore } from '@/store/experimentStore';
import InterpolationCanvas from '@/components/Canvas/InterpolationCanvas';
import ErrorCanvas from '@/components/Canvas/ErrorCanvas';
import { ArrowLeftRight, X } from 'lucide-react';

export default function ManualCorrection() {
  const functionType = useExperimentStore((s) => s.functionType);
  const setFunctionType = useExperimentStore((s) => s.setFunctionType);
  const customExpr = useExperimentStore((s) => s.customExpr);
  const setCustomExpr = useExperimentStore((s) => s.setCustomExpr);
  const currentResult = useExperimentStore((s) => s.currentResult);
  const previousResult = useExperimentStore((s) => s.previousResult);
  const showComparison = useExperimentStore((s) => s.showComparison);
  const clearComparison = useExperimentStore((s) => s.clearComparison);
  const startComparison = useExperimentStore((s) => s.startComparison);
  const points = useExperimentStore((s) => s.points);

  if (points.length < 2) return null;

  return (
    <div className="bg-[#1a1f36] rounded-lg border border-white/10 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white/80">手动修正</h3>
        {showComparison && (
          <button
            onClick={clearComparison}
            className="text-white/30 hover:text-white/60 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="space-y-2">
        <label className="text-xs text-white/50">修改函数类型后自动对比</label>
        <div className="flex gap-1.5">
          {(['runge', 'sin', 'exp', 'custom'] as const).map((fn) => (
            <button
              key={fn}
              onClick={() => {
                if (fn !== functionType) startComparison();
                setFunctionType(fn);
              }}
              className={`flex-1 px-2 py-1.5 rounded text-xs transition-all ${
                functionType === fn
                  ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                  : 'bg-white/5 text-white/50 border border-white/10 hover:bg-white/10'
              }`}
            >
              {fn === 'custom' ? '自定义' : fn.charAt(0).toUpperCase() + fn.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {functionType === 'custom' && (
        <input
          type="text"
          value={customExpr}
          onChange={(e) => setCustomExpr(e.target.value)}
          placeholder="例如: Math.sin(x) * x"
          className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white/90 outline-none focus:border-cyan-500/50 font-mono"
        />
      )}

      {showComparison && previousResult && currentResult && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs text-white/50">
            <ArrowLeftRight size={14} className="text-cyan-400" />
            新旧结果并排对比
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="text-[10px] text-rose-400 font-medium">旧结果</div>
              <div className="h-40 rounded overflow-hidden border border-white/5">
                <InterpolationCanvas
                  points={previousResult.points}
                  functionType={functionType}
                  customExpr={customExpr}
                  evaluatedCurve={previousResult.evaluatedCurve}
                />
              </div>
            </div>
            <div className="space-y-1">
              <div className="text-[10px] text-emerald-400 font-medium">新结果</div>
              <div className="h-40 rounded overflow-hidden border border-white/5">
                <InterpolationCanvas
                  points={currentResult.points}
                  functionType={functionType}
                  customExpr={customExpr}
                  evaluatedCurve={currentResult.evaluatedCurve}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="h-32 rounded overflow-hidden border border-white/5">
              <ErrorCanvas
                errorCurve={previousResult.errorCurve}
                maxError={previousResult.maxError}
              />
            </div>
            <div className="h-32 rounded overflow-hidden border border-white/5">
              <ErrorCanvas
                errorCurve={currentResult.errorCurve}
                maxError={currentResult.maxError}
              />
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-white/40">
                  <th className="text-left py-1">指标</th>
                  <th className="text-right py-1 text-rose-400">旧</th>
                  <th className="text-right py-1 text-emerald-400">新</th>
                  <th className="text-right py-1">变化</th>
                </tr>
              </thead>
              <tbody className="text-white/70">
                <tr className="border-t border-white/5">
                  <td className="py-1">最大误差</td>
                  <td className="text-right font-mono">{previousResult.maxError.toFixed(4)}</td>
                  <td className="text-right font-mono">{currentResult.maxError.toFixed(4)}</td>
                  <td className={`text-right font-mono ${currentResult.maxError > previousResult.maxError ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {currentResult.maxError > previousResult.maxError ? '↑' : '↓'}
                    {Math.abs(((currentResult.maxError - previousResult.maxError) / Math.max(previousResult.maxError, 1e-10)) * 100).toFixed(1)}%
                  </td>
                </tr>
                <tr className="border-t border-white/5">
                  <td className="py-1">RMSE</td>
                  <td className="text-right font-mono">{previousResult.rmse.toFixed(4)}</td>
                  <td className="text-right font-mono">{currentResult.rmse.toFixed(4)}</td>
                  <td className={`text-right font-mono ${currentResult.rmse > previousResult.rmse ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {currentResult.rmse > previousResult.rmse ? '↑' : '↓'}
                    {Math.abs(((currentResult.rmse - previousResult.rmse) / Math.max(previousResult.rmse, 1e-10)) * 100).toFixed(1)}%
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
