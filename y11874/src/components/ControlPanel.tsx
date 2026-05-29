import { useState, useEffect, useCallback } from 'react';
import { SlidersHorizontal, Play, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { useSurfaceStore } from '@/store/useSurfaceStore';
import { PRESET_FUNCTIONS } from '@/types';
import type { SurfaceConfig } from '@/types';

export default function ControlPanel() {
  const config = useSurfaceStore((s) => s.config);
  const parseError = useSurfaceStore((s) => s.parseError);
  const setExpression = useSurfaceStore((s) => s.setExpression);
  const setXRange = useSurfaceStore((s) => s.setXRange);
  const setYRange = useSurfaceStore((s) => s.setYRange);
  const setZRange = useSurfaceStore((s) => s.setZRange);
  const setSamplingDensity = useSurfaceStore((s) => s.setSamplingDensity);
  const setConfig = useSurfaceStore((s) => s.setConfig);
  const recompute = useSurfaceStore((s) => s.recompute);
  const isComputing = useSurfaceStore((s) => s.isComputing);

  const [showPresets, setShowPresets] = useState(false);
  const [localExpr, setLocalExpr] = useState(config.expression);

  useEffect(() => {
    setLocalExpr(config.expression);
  }, [config.expression]);

  const handleApply = useCallback(() => {
    setExpression(localExpr);
    setTimeout(() => recompute(), 0);
  }, [localExpr, setExpression, recompute]);

  const handlePreset = useCallback((preset: typeof PRESET_FUNCTIONS[0]) => {
    const newConfig: SurfaceConfig = {
      expression: preset.expression,
      xRange: preset.xRange,
      yRange: preset.yRange,
      zRange: [-10, 10],
      samplingDensity: config.samplingDensity,
    };
    setConfig(newConfig);
    setLocalExpr(preset.expression);
    setTimeout(() => recompute(), 0);
    setShowPresets(false);
  }, [config.samplingDensity, setConfig, recompute]);

  const handleReset = useCallback(() => {
    setLocalExpr('x^2 - y^2');
    setConfig({
      expression: 'x^2 - y^2',
      xRange: [-3, 3],
      yRange: [-3, 3],
      zRange: [-10, 10],
      samplingDensity: 50,
    });
    setTimeout(() => recompute(), 0);
  }, [setConfig, recompute]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#00e5c8] uppercase tracking-wider">
        <SlidersHorizontal size={16} />
        参数控制
      </div>

      <div className="space-y-2">
        <label className="text-xs text-gray-400">函数表达式 z = f(x, y)</label>
        <div className="flex gap-2">
          <input
            type="text"
            value={localExpr}
            onChange={(e) => setLocalExpr(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleApply()}
            className="flex-1 bg-[#0d1520] border border-[#1a2a3a] rounded-lg px-3 py-2 text-sm font-mono text-[#00e5c8] placeholder-gray-600 focus:outline-none focus:border-[#00e5c8]/50 focus:ring-1 focus:ring-[#00e5c8]/30"
            placeholder="例: x^2 - y^2"
          />
          <button
            onClick={handleApply}
            disabled={isComputing}
            className="px-3 py-2 bg-[#00e5c8]/10 border border-[#00e5c8]/30 rounded-lg text-[#00e5c8] hover:bg-[#00e5c8]/20 transition-all disabled:opacity-50"
          >
            <Play size={16} />
          </button>
        </div>
        {parseError && (
          <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-2">
            <p className="text-xs text-red-400">{parseError.message}</p>
            <p className="text-xs text-red-300/70 mt-1">💡 {parseError.suggestion}</p>
          </div>
        )}
      </div>

      <div>
        <button
          onClick={() => setShowPresets(!showPresets)}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#00e5c8] transition-colors"
        >
          预设函数库 {showPresets ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
        </button>
        {showPresets && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {PRESET_FUNCTIONS.map((p) => (
              <button
                key={p.name}
                onClick={() => handlePreset(p)}
                className="w-full text-left bg-[#0d1520] border border-[#1a2a3a] rounded-lg p-2 hover:border-[#00e5c8]/30 transition-all"
              >
                <div className="text-xs text-[#00e5c8] font-mono">{p.nameCN} · {p.expression}</div>
                <div className="text-xs text-gray-500 mt-0.5">{p.description}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <RangeSlider label="X 范围" value={config.xRange} onChange={setXRange} />
        <RangeSlider label="Y 范围" value={config.yRange} onChange={setYRange} />
        <RangeSlider label="Z 范围" value={config.zRange} onChange={setZRange} />
      </div>

      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-xs text-gray-400">采样密度</label>
          <span className="text-xs font-mono text-[#00e5c8]">{config.samplingDensity}×{config.samplingDensity}</span>
        </div>
        <input
          type="range"
          min={10}
          max={200}
          step={5}
          value={config.samplingDensity}
          onChange={(e) => setSamplingDensity(Number(e.target.value))}
          className="w-full h-1.5 bg-[#1a2a3a] rounded-full appearance-none cursor-pointer accent-[#00e5c8]"
        />
        {config.samplingDensity < 50 && (
          <p className="text-xs text-amber-400/80">⚠ 采样密度较低，极值检测可能不准确</p>
        )}
      </div>

      <button
        onClick={handleReset}
        className="flex items-center justify-center gap-1.5 px-3 py-2 bg-[#0d1520] border border-[#1a2a3a] rounded-lg text-xs text-gray-400 hover:text-[#00e5c8] hover:border-[#00e5c8]/30 transition-all"
      >
        <RotateCcw size={12} />
        重置默认
      </button>
    </div>
  );
}

function RangeSlider({ label, value, onChange }: { label: string; value: [number, number]; onChange: (v: [number, number]) => void }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-xs text-gray-400">{label}</label>
        <span className="text-xs font-mono text-gray-500">[{value[0]}, {value[1]}]</span>
      </div>
      <div className="flex gap-2 items-center">
        <input
          type="number"
          value={value[0]}
          onChange={(e) => onChange([Number(e.target.value), value[1]])}
          className="w-16 bg-[#0d1520] border border-[#1a2a3a] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#00e5c8]/50"
        />
        <span className="text-xs text-gray-600">~</span>
        <input
          type="number"
          value={value[1]}
          onChange={(e) => onChange([value[0], Number(e.target.value)])}
          className="w-16 bg-[#0d1520] border border-[#1a2a3a] rounded px-2 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#00e5c8]/50"
        />
      </div>
    </div>
  );
}
