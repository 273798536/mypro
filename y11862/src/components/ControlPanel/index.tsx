import { Sliders, RotateCcw, Eye, Grid3X3, Maximize2 } from 'lucide-react';
import { useSpectrumStore } from '../../store/spectrumStore';
import { DEFAULT_VISUAL_PARAMS } from '../../types';

export function ControlPanel() {
  const { visualParams, setVisualParams, resetVisualParams } = useSpectrumStore();

  const handleSliderChange = (key: keyof typeof visualParams, value: number) => {
    setVisualParams({ [key]: value });
  };

  const handleToggle = (key: 'showGrid' | 'showAxes') => {
    setVisualParams({ [key]: !visualParams[key] });
  };

  const presets = [
    { name: '全频段', params: { freqMin: 20, freqMax: 20000, energyThreshold: -60 } },
    { name: '低中频', params: { freqMin: 20, freqMax: 2000, energyThreshold: -50 } },
    { name: '中高频', params: { freqMin: 500, freqMax: 20000, energyThreshold: -45 } },
    { name: '高亮细节', params: { freqMin: 2000, freqMax: 20000, energyThreshold: -40 } },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">可视化参数</h3>
        </div>
        <button
          onClick={resetVisualParams}
          className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded transition-all"
        >
          <RotateCcw className="w-3 h-3" />
          重置
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">最低频率</span>
            <span className="text-cyan-400 font-mono">{visualParams.freqMin} Hz</span>
          </div>
          <input
            type="range"
            min="20"
            max="500"
            step="10"
            value={visualParams.freqMin}
            onChange={(e) => handleSliderChange('freqMin', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">最高频率</span>
            <span className="text-cyan-400 font-mono">{visualParams.freqMax} Hz</span>
          </div>
          <input
            type="range"
            min="2000"
            max="20000"
            step="100"
            value={visualParams.freqMax}
            onChange={(e) => handleSliderChange('freqMax', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">能量阈值</span>
            <span className="text-emerald-400 font-mono">{visualParams.energyThreshold} dB</span>
          </div>
          <input
            type="range"
            min="-80"
            max="-10"
            step="1"
            value={visualParams.energyThreshold}
            onChange={(e) => handleSliderChange('energyThreshold', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-400">柱体透明度</span>
            <span className="text-amber-400 font-mono">{(visualParams.barOpacity * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0.2"
            max="1"
            step="0.05"
            value={visualParams.barOpacity}
            onChange={(e) => handleSliderChange('barOpacity', Number(e.target.value))}
            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
          />
        </div>
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => handleToggle('showGrid')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all
            ${visualParams.showGrid
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-gray-600'
            }`}
        >
          <Grid3X3 className="w-3.5 h-3.5" />
          网格
        </button>
        <button
          onClick={() => handleToggle('showAxes')}
          className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg text-xs font-medium transition-all
            ${visualParams.showAxes
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'bg-gray-800 text-gray-500 border border-gray-700 hover:border-gray-600'
            }`}
        >
          <Maximize2 className="w-3.5 h-3.5" />
          坐标轴
        </button>
      </div>

      <div className="pt-3 border-t border-gray-700">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wider mb-2">快速预设</p>
        <div className="grid grid-cols-2 gap-2">
          {presets.map((preset, idx) => (
            <button
              key={idx}
              onClick={() => setVisualParams(preset.params)}
              className="px-2 py-1.5 bg-gray-800 hover:bg-gray-700 rounded text-xs text-gray-300 transition-all text-left"
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
