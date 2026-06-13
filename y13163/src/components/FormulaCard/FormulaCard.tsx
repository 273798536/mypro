import { useParamStore } from '@/store/useParamStore';
import { Calculator, Info, Ruler } from 'lucide-react';

export default function FormulaCard() {
  const { getCurrentVersionData } = useParamStore();
  const version = getCurrentVersionData();

  if (!version) return null;

  return (
    <div className="bg-slate-800/40 backdrop-blur-sm rounded-xl border border-slate-700/50 overflow-hidden">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-cyan-glow" />
          <h4 className="text-white font-semibold">误差归因公式</h4>
          <span className="ml-auto px-2 py-0.5 rounded text-xs font-medium bg-cyan-glow/20 text-cyan-glow">
            {version.version}
          </span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="bg-slate-900/60 rounded-lg p-4 text-center">
          <div className="text-2xl font-mono text-cyan-glow tracking-wide">
            {version.formula}
          </div>
          <p className="mt-2 text-sm text-slate-400">{version.formulaDescription}</p>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-cyan-glow" />
            <span className="text-sm font-medium text-white">变量说明</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {version.variables.map((variable) => (
              <div
                key={variable.symbol}
                className="bg-slate-900/40 rounded-lg p-3 border border-slate-700/30"
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-mono text-cyan-glow">{variable.symbol}</span>
                  <span className="text-xs text-slate-400">=</span>
                  <span className="text-sm text-white">{variable.name}</span>
                </div>
                <div className="text-xs text-slate-400">
                  单位：<span className="text-slate-300 font-mono">{variable.unit}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{variable.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Ruler className="w-4 h-4 text-warning-orange" />
            <span className="text-sm font-medium text-white">边界值配置</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {version.boundaryValues.map((boundary) => (
              <div
                key={boundary.name}
                className={`rounded-lg p-3 border text-center ${
                  boundary.name.includes('误差') || boundary.name.includes('噪声')
                    ? 'bg-warning-orange/10 border-warning-orange/30'
                    : 'bg-slate-900/40 border-slate-700/30'
                }`}
              >
                <div className="text-xs text-slate-400 mb-1">{boundary.name}</div>
                <div className="text-lg font-mono text-white">
                  {boundary.value}
                  <span className="text-xs text-slate-400 ml-1">{boundary.unit}</span>
                </div>
                <div className="text-xs text-slate-500 mt-1">{boundary.description}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-700/50">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">版本说明</span>
            <span className="text-slate-500">{version.createdAt}</span>
          </div>
          <p className="mt-1 text-sm text-slate-300">{version.description}</p>
        </div>
      </div>
    </div>
  );
}
