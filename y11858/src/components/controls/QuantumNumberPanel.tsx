import { useAppStore } from '../../store/useAppStore';
import { PRESET_ORBITALS } from '../../utils/presets';
import { Play, RotateCcw, Atom } from 'lucide-react';

export function QuantumNumberPanel() {
  const currentParams = useAppStore((s) => s.currentParams);
  const setParams = useAppStore((s) => s.setParams);
  const runCalculation = useAppStore((s) => s.runCalculation);
  const isCalculating = useAppStore((s) => s.isCalculating);
  const loadPreset = useAppStore((s) => s.loadPreset);
  const volumeData = useAppStore((s) => s.volumeData);

  const lLabels = ['s', 'p', 'd', 'f', 'g', 'h', 'i'];
  const currentLLabel = lLabels[currentParams.l] || `l=${currentParams.l}`;

  const handleNChange = (n: number) => {
    setParams({ n });
  };

  const handleLChange = (l: number) => {
    setParams({ l });
  };

  const handleMChange = (m: number) => {
    setParams({ m });
  };

  const mRange = [];
  for (let i = -currentParams.l; i <= currentParams.l; i++) {
    mRange.push(i);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Atom className="w-4 h-4 text-cyan-400" />
        <h3 className="text-sm font-semibold text-cyan-300 tracking-wide uppercase">
          量子数控制
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">主量子数 n</label>
          <span className="text-sm font-mono text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded">
            {currentParams.n}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          value={currentParams.n}
          onChange={(e) => handleNChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-cyan-400/30
            [&::-webkit-slider-thumb]:hover:bg-cyan-300
            [&::-webkit-slider-thumb]:transition-colors"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">角量子数 l ({currentLLabel})</label>
          <span className="text-sm font-mono text-purple-400 bg-purple-400/10 px-2 py-0.5 rounded">
            {currentParams.l} ({currentLLabel})
          </span>
        </div>
        <input
          type="range"
          min={0}
          max={currentParams.n - 1}
          value={currentParams.l}
          onChange={(e) => handleLChange(Number(e.target.value))}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-purple-400/30
            [&::-webkit-slider-thumb]:hover:bg-purple-300
            [&::-webkit-slider-thumb]:transition-colors"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">磁量子数 m</label>
          <span className="text-sm font-mono text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
            {currentParams.m}
          </span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {mRange.map((m) => (
            <button
              key={m}
              onClick={() => handleMChange(m)}
              className={`px-2.5 py-1 text-xs font-mono rounded transition-all ${
                currentParams.m === m
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/50 shadow-sm shadow-amber-400/20'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-400'
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-slate-700/50">
        <label className="text-xs text-slate-400 mb-2 block">预设轨道</label>
        <div className="flex gap-1.5 flex-wrap">
          {PRESET_ORBITALS.slice(0, 10).map((preset) => (
            <button
              key={preset.id}
              onClick={() => loadPreset(preset.id)}
              className={`px-2 py-1 text-xs rounded transition-all ${
                currentParams.id === preset.id
                  ? 'bg-cyan-400/20 text-cyan-300 border border-cyan-400/40'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:bg-slate-700/50 hover:text-slate-300'
              } ${!preset.isNormalized ? 'ring-1 ring-red-400/30' : ''}`}
            >
              {preset.name}
            </button>
          ))}
        </div>
        {PRESET_ORBITALS.length > 10 && (
          <div className="mt-2">
            <label className="text-xs text-slate-500 mb-1 block">测试用例</label>
            <div className="flex gap-1.5 flex-wrap">
              {PRESET_ORBITALS.slice(10).map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => loadPreset(preset.id)}
                  className={`px-2 py-1 text-xs rounded transition-all ${
                    currentParams.id === preset.id
                      ? 'bg-red-400/20 text-red-300 border border-red-400/40'
                      : 'bg-red-400/5 text-red-400/60 border border-red-400/20 hover:bg-red-400/10 hover:text-red-300'
                  }`}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 pt-1">
        <div className="text-xs text-slate-500">
          ψ({currentParams.n},{currentParams.l},{currentParams.m}) = R<sub>{currentParams.n}{currentLLabel}</sub>(r) · Y<sub>{currentParams.l}</sub><sup>{currentParams.m}</sup>(θ,φ)
        </div>
        {!currentParams.isNormalized && (
          <span className="text-[10px] px-1.5 py-0.5 bg-red-400/20 text-red-300 rounded border border-red-400/30">
            未归一化 ×{currentParams.normalizationFactor}
          </span>
        )}
      </div>

      <button
        onClick={runCalculation}
        disabled={isCalculating}
        className={`w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
          isCalculating
            ? 'bg-slate-700 text-slate-500 cursor-wait'
            : volumeData
            ? 'bg-gradient-to-r from-cyan-500/20 to-purple-500/20 text-cyan-300 border border-cyan-400/30 hover:from-cyan-500/30 hover:to-purple-500/30 hover:shadow-lg hover:shadow-cyan-400/10'
            : 'bg-gradient-to-r from-cyan-500/30 to-purple-500/30 text-white border border-cyan-400/40 hover:shadow-lg hover:shadow-cyan-400/20'
        }`}
      >
        {isCalculating ? (
          <>
            <RotateCcw className="w-4 h-4 animate-spin" />
            计算中...
          </>
        ) : (
          <>
            <Play className="w-4 h-4" />
            {volumeData ? '重新计算' : '开始计算'}
          </>
        )}
      </button>
    </div>
  );
}
