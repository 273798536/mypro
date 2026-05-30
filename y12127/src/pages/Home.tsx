import { useExperimentStore } from '@/store/experimentStore';
import InterpolationCanvas from '@/components/Canvas/InterpolationCanvas';
import ErrorCanvas from '@/components/Canvas/ErrorCanvas';
import SamplingTable from '@/components/SamplingTable';
import ParameterPanel from '@/components/ParameterPanel';
import ImportPanel from '@/components/ImportPanel';
import ExampleCards from '@/components/ExampleCards';
import ManualCorrection from '@/components/ManualCorrection';
import ErrorAnalysis from '@/components/ErrorAnalysis';
import { RotateCcw, FlaskConical } from 'lucide-react';

export default function Home() {
  const points = useExperimentStore((s) => s.points);
  const functionType = useExperimentStore((s) => s.functionType);
  const customExpr = useExperimentStore((s) => s.customExpr);
  const currentResult = useExperimentStore((s) => s.currentResult);
  const previousResult = useExperimentStore((s) => s.previousResult);
  const showComparison = useExperimentStore((s) => s.showComparison);
  const reset = useExperimentStore((s) => s.reset);
  const noiseConfig = useExperimentStore((s) => s.noiseConfig);

  return (
    <div className="min-h-screen bg-[#0d0f1a] text-white flex flex-col">
      <header className="border-b border-white/10 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center text-amber-400">
            <FlaskConical size={18} />
          </div>
          <div>
            <h1 className="text-sm font-semibold text-white/90 tracking-wide">多项式插值实验台</h1>
            <p className="text-[10px] text-white/40">Polynomial Interpolation Workbench</p>
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 text-white/50 rounded text-xs hover:bg-white/10 transition-colors"
        >
          <RotateCcw size={12} />
          重置
        </button>
      </header>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">
          <div className="flex-1 min-h-0 rounded-lg border border-white/10 overflow-hidden relative">
            <InterpolationCanvas
              points={points}
              functionType={functionType}
              customExpr={customExpr}
              evaluatedCurve={currentResult?.evaluatedCurve}
              showFunction={points.length > 0}
              comparisonCurve={showComparison && previousResult ? previousResult.evaluatedCurve : undefined}
              comparisonLabel={showComparison ? '旧结果' : undefined}
            />
            {currentResult && currentResult.warnings.some(w => w.type === 'boundary_oscillation') && (
              <div className="absolute top-3 left-3 bg-amber-500/10 border border-amber-500/30 rounded px-2 py-1 text-[10px] text-amber-400">
                ⚠ 边界震荡检测中
              </div>
            )}
          </div>

          <div className="h-48 rounded-lg border border-white/10 overflow-hidden shrink-0">
            {currentResult ? (
              <ErrorCanvas
                errorCurve={currentResult.errorCurve}
                maxError={currentResult.maxError}
                comparisonErrorCurve={showComparison && previousResult ? previousResult.errorCurve : undefined}
              />
            ) : (
              <div className="w-full h-full bg-[#0f1225] flex items-center justify-center text-xs text-white/20">
                添加采样点后显示误差曲线
              </div>
            )}
          </div>

          <div className="shrink-0">
            <ErrorAnalysis />
          </div>
        </div>

        <div className="w-[380px] shrink-0 border-l border-white/10 overflow-y-auto p-4 space-y-3">
          <ParameterPanel />
          <SamplingTable />
          <ImportPanel />
          <ExampleCards />
          <ManualCorrection />

          {noiseConfig && currentResult && (
            <div className="bg-white/5 rounded-lg p-3 space-y-1">
              <div className="text-[10px] text-white/40">当前配置</div>
              <div className="text-xs text-white/60">
                函数: <span className="text-amber-400">{functionType}</span>
                {' · '}噪声: <span className="text-cyan-400">{noiseConfig.amplitude.toFixed(3)}</span>
                {' · '}种子: <span className="text-white/50">{noiseConfig.seed}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
