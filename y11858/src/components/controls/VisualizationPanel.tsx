import { useAppStore } from '../../store/useAppStore';
import { Eye, EyeOff, Layers, Palette } from 'lucide-react';
import type { ColorMapName } from '../../types';

const COLOR_MAP_OPTIONS: { value: ColorMapName; label: string }[] = [
  { value: 'quantum', label: '量子色' },
  { value: 'viridis', label: 'Viridis' },
  { value: 'plasma', label: 'Plasma' },
  { value: 'rainbow', label: '彩虹' },
];

export function VisualizationPanel() {
  const vizSettings = useAppStore((s) => s.vizSettings);
  const setVizSettings = useAppStore((s) => s.setVizSettings);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Layers className="w-4 h-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-purple-300 tracking-wide uppercase">
          可视化设置
        </h3>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">分辨率</label>
          <span className="text-xs font-mono text-slate-500">{vizSettings.resolution}</span>
        </div>
        <input
          type="range"
          min={24}
          max={80}
          step={4}
          value={vizSettings.resolution}
          onChange={(e) => setVizSettings({ resolution: Number(e.target.value) })}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-purple-400/30"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">空间范围</label>
          <span className="text-xs font-mono text-slate-500">±{vizSettings.gridSize} a₀</span>
        </div>
        <input
          type="range"
          min={5}
          max={25}
          step={1}
          value={vizSettings.gridSize}
          onChange={(e) => setVizSettings({ gridSize: Number(e.target.value) })}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-purple-400/30"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs text-slate-400">体积云透明度</label>
          <span className="text-xs font-mono text-slate-500">{vizSettings.volumeOpacity.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.05}
          max={1}
          step={0.05}
          value={vizSettings.volumeOpacity}
          onChange={(e) => setVizSettings({ volumeOpacity: Number(e.target.value) })}
          className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
            [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
            [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-cyan-400 [&::-webkit-slider-thumb]:shadow-lg
            [&::-webkit-slider-thumb]:shadow-cyan-400/30"
        />
      </div>

      <div className="pt-2 border-t border-slate-700/50">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs text-slate-400">等值面</label>
          <button
            onClick={() => setVizSettings({ showIsosurface: !vizSettings.showIsosurface })}
            className="text-xs flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
          >
            {vizSettings.showIsosurface ? (
              <Eye className="w-3.5 h-3.5 text-cyan-400" />
            ) : (
              <EyeOff className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
        {vizSettings.showIsosurface && (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500">阈值</label>
                <span className="text-xs font-mono text-slate-500">{vizSettings.isoThreshold.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.01}
                max={0.8}
                step={0.01}
                value={vizSettings.isoThreshold}
                onChange={(e) => setVizSettings({ isoThreshold: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
                  [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cyan-400"
              />
            </div>
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between">
                <label className="text-xs text-slate-500">表面透明度</label>
                <span className="text-xs font-mono text-slate-500">{vizSettings.isoOpacity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min={0.1}
                max={1}
                step={0.05}
                value={vizSettings.isoOpacity}
                onChange={(e) => setVizSettings({ isoOpacity: Number(e.target.value) })}
                className="w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
                  [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
                  [&::-webkit-slider-thumb]:bg-cyan-400"
              />
            </div>
          </>
        )}
      </div>

      <div className="pt-2 border-t border-slate-700/50">
        <div className="flex items-center gap-2 mb-2">
          <Palette className="w-3.5 h-3.5 text-amber-400" />
          <label className="text-xs text-slate-400">色图</label>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {COLOR_MAP_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setVizSettings({ colorMap: opt.value })}
              className={`px-2.5 py-1 text-xs rounded transition-all ${
                vizSettings.colorMap === opt.value
                  ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                  : 'bg-slate-800/50 text-slate-500 border border-slate-700/50 hover:text-slate-300'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-2 flex items-center gap-2">
          <label className="text-xs text-slate-500">对数刻度</label>
          <button
            onClick={() => setVizSettings({ useLogScale: !vizSettings.useLogScale })}
            className={`w-8 h-4 rounded-full transition-all ${
              vizSettings.useLogScale
                ? 'bg-cyan-400/40 shadow-sm shadow-cyan-400/20'
                : 'bg-slate-700'
            }`}
          >
            <div
              className={`w-3 h-3 rounded-full transition-all ${
                vizSettings.useLogScale
                  ? 'bg-cyan-400 translate-x-4.5'
                  : 'bg-slate-500 translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>
    </div>
  );
}
