import { useMemo } from 'react';
import { Pi, BookOpen, ArrowRight } from 'lucide-react';
import { useParamStore } from '../../store/useParamStore';
import { getVolumeForDisplay } from '../../utils/math/volumeCalculator';
import 'katex/dist/katex.min.css';

declare global {
  interface Window {
    katex?: {
      renderToString: (expr: string, options?: { displayMode?: boolean; throwOnError?: boolean }) => string;
    };
  }
}

function renderLatex(latex: string): string {
  if (typeof window !== 'undefined' && window.katex) {
    try {
      return window.katex.renderToString(latex, { displayMode: false, throwOnError: false });
    } catch {
      return latex;
    }
  }
  return latex;
}

export function VolumeInfo() {
  const { currentResult, isCalculating, functionExpr, intervalA, intervalB, method, rotationAxis } =
    useParamStore();

  const volumeSteps = useMemo(() => {
    if (!currentResult) return [];
    return currentResult.steps;
  }, [currentResult]);

  const axisLabel = rotationAxis === 'x' ? 'X' : rotationAxis === 'y' ? 'Y' : '自定义';

  return (
    <div className="mt-4 p-4 bg-gradient-to-br from-blue-900/30 to-indigo-900/30 border border-blue-500/20 rounded-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-blue-300 flex items-center gap-2">
          <Pi size={16} />
          体积计算
        </h3>
        {isCalculating && <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />}
      </div>

      <div className="mb-4 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
        <div className="text-xs text-slate-400 mb-1">当前配置</div>
        <div className="text-sm text-slate-200 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-500">函数:</span>
            <code className="text-blue-400 font-mono text-xs">f(x) = {functionExpr}</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">区间:</span>
            <code className="text-green-400 font-mono text-xs">[{intervalA}, {intervalB}]</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">转轴:</span>
            <code className="text-purple-400 font-mono text-xs">{axisLabel}轴</code>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-500">方法:</span>
            <code className="text-amber-400 font-mono text-xs">{method === 'disk' ? '圆盘法' : '壳层法'}</code>
          </div>
        </div>
      </div>

      {currentResult && (
        <div className="space-y-3">
          <div className="text-center p-4 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 rounded-lg border border-blue-500/30">
            <div className="text-xs text-slate-400 mb-1">计算结果</div>
            <div className="text-2xl font-bold text-white font-mono">
              V = {getVolumeForDisplay(currentResult.volume)}
            </div>
            <div className="text-xs text-blue-300 mt-1">立方单位</div>
          </div>

          <div className="space-y-2">
            <div className="text-xs text-slate-400 flex items-center gap-1">
              <BookOpen size={12} />
              计算步骤
            </div>
            {volumeSteps.map((step, idx) => (
              <div key={idx} className="flex items-start gap-2 text-sm">
                <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs text-white font-medium flex-shrink-0 mt-0.5">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <div className="text-slate-300 text-xs mb-0.5">{step.description}</div>
                  <div
                    className="text-blue-300 font-mono text-sm bg-slate-800/50 px-2 py-1 rounded border border-slate-700/50"
                    dangerouslySetInnerHTML={{ __html: renderLatex(step.formula) }}
                  />
                </div>
                {idx < volumeSteps.length - 1 && (
                  <ArrowRight size={14} className="text-slate-600 flex-shrink-0 mt-1" />
                )}
              </div>
            ))}
          </div>

          {currentResult.sliceAreas.length > 0 && (
            <div className="pt-3 border-t border-slate-700/50">
              <div className="text-xs text-slate-400 mb-2">切片面积预览</div>
              <div className="flex flex-wrap gap-1">
                {currentResult.sliceAreas.slice(0, 12).map((area, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 bg-slate-800/80 rounded text-xs text-slate-400 font-mono"
                    title={`切片 ${idx + 1}: ${area.toFixed(4)}`}
                  >
                    {area.toFixed(2)}
                  </div>
                ))}
                {currentResult.sliceAreas.length > 12 && (
                  <div className="px-2 py-1 text-xs text-slate-500">
                    +{currentResult.sliceAreas.length - 12} 更多
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
