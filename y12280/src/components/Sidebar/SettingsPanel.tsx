import { Settings, Eye, Tag, RefreshCw } from 'lucide-react';
import { useMagneticStore } from '@/store/magneticStore';

export function SettingsPanel() {
  const {
    sampleDensity,
    showFieldLines,
    showStrengthLabels,
    syncFilters,
    setSampleDensity,
    toggleFieldLines,
    toggleStrengthLabels,
    toggleSyncFilters,
    recalculateField
  } = useMagneticStore();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-cyan-400 flex items-center gap-2">
        <Settings size={16} />
        显示设置
      </h3>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Eye size={14} className="text-gray-500" />
            显示场线
          </div>
          <button
            onClick={toggleFieldLines}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              showFieldLines ? 'bg-cyan-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                showFieldLines ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Tag size={14} className="text-gray-500" />
            强度标注
          </div>
          <button
            onClick={toggleStrengthLabels}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              showStrengthLabels ? 'bg-cyan-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                showStrengthLabels ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <RefreshCw size={14} className="text-gray-500" />
            筛选同步
          </div>
          <button
            onClick={toggleSyncFilters}
            className={`w-10 h-5 rounded-full transition-colors relative ${
              syncFilters ? 'bg-cyan-600' : 'bg-gray-700'
            }`}
          >
            <span
              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                syncFilters ? 'translate-x-5' : 'translate-x-0.5'
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-2 pt-2 border-t border-gray-700/50">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-400">采样密度</span>
          <span className="text-cyan-400">{sampleDensity} 点/区</span>
        </div>
        <input
          type="range"
          min="4"
          max="64"
          value={sampleDensity}
          onChange={(e) => setSampleDensity(Number(e.target.value))}
          className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <p className="text-[10px] text-gray-500">
          注意：过高的采样密度可能导致性能下降
        </p>
      </div>

      <button
        onClick={recalculateField}
        className="w-full py-2 bg-gray-700/50 hover:bg-gray-600/50 text-gray-300 text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
      >
        <RefreshCw size={14} />
        重新计算磁场
      </button>
    </div>
  );
}
