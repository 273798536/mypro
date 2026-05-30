import { useExperimentStore } from '@/store/experimentStore';
import type { FunctionType } from '@/types';
import { generateEquidistantPoints } from '@/utils/interpolation';

const FUNCTION_OPTIONS: { value: FunctionType; label: string; formula: string }[] = [
  { value: 'runge', label: 'Runge', formula: 'f(x) = 1/(1+25x²)' },
  { value: 'sin', label: 'Sin', formula: 'f(x) = sin(πx)' },
  { value: 'exp', label: 'Exp', formula: 'f(x) = e^(-x²)' },
  { value: 'custom', label: '自定义', formula: 'f(x) = ...' },
];

export default function ParameterPanel() {
  const functionType = useExperimentStore((s) => s.functionType);
  const setFunctionType = useExperimentStore((s) => s.setFunctionType);
  const customExpr = useExperimentStore((s) => s.customExpr);
  const setCustomExpr = useExperimentStore((s) => s.setCustomExpr);
  const setPoints = useExperimentStore((s) => s.setPoints);
  const points = useExperimentStore((s) => s.points);

  const handleGeneratePoints = (n: number) => {
    const newPoints = generateEquidistantPoints(functionType, n, -1, 1, customExpr);
    setPoints(newPoints);
  };

  return (
    <div className="bg-[#1a1f36] rounded-lg border border-white/10 p-4 space-y-4">
      <h3 className="text-sm font-medium text-white/80">函数与采样</h3>

      <div className="space-y-2">
        <label className="text-xs text-white/50">函数类型</label>
        <div className="grid grid-cols-2 gap-1.5">
          {FUNCTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setFunctionType(opt.value)}
              className={`px-3 py-2 rounded text-xs transition-all ${
                functionType === opt.value
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              <div className="font-medium">{opt.label}</div>
              <div className="text-[10px] opacity-60 mt-0.5">{opt.formula}</div>
            </button>
          ))}
        </div>
      </div>

      {functionType === 'custom' && (
        <div className="space-y-1">
          <label className="text-xs text-white/50">自定义表达式（以 x 为变量）</label>
          <input
            type="text"
            value={customExpr}
            onChange={(e) => setCustomExpr(e.target.value)}
            placeholder="例如: Math.sin(x) * x"
            className="w-full bg-white/5 border border-white/10 rounded px-3 py-2 text-xs text-white/90 outline-none focus:border-amber-500/50 font-mono"
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-xs text-white/50">快速生成等距采样点</label>
        <div className="flex gap-1.5">
          {[5, 8, 11, 15, 21].map((n) => (
            <button
              key={n}
              onClick={() => handleGeneratePoints(n)}
              className={`flex-1 px-2 py-1.5 rounded text-xs transition-all ${
                points.length === n
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
              }`}
            >
              {n} 点
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-white/10">
        <p className="text-[10px] text-white/30 leading-relaxed">
          当前函数: <span className="text-amber-400/70 font-mono">{FUNCTION_OPTIONS.find((o) => o.value === functionType)?.formula}</span>
          {points.length > 0 && (
            <> · 采样点: <span className="text-emerald-400/70">{points.length} 个</span></>
          )}
        </p>
      </div>
    </div>
  );
}
