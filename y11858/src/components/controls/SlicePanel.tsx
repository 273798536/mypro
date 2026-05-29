import { useAppStore } from '../../store/useAppStore';
import { Scissors } from 'lucide-react';

export function SlicePanel() {
  const sliceSettings = useAppStore((s) => s.sliceSettings);
  const setSliceSettings = useAppStore((s) => s.setSliceSettings);
  const gridSize = useAppStore((s) => s.vizSettings.gridSize);

  const axes = [
    { key: 'x' as const, color: 'red', label: 'X', posKey: 'xPosition' as const, enabledKey: 'xEnabled' as const },
    { key: 'y' as const, color: 'green', label: 'Y', posKey: 'yPosition' as const, enabledKey: 'yEnabled' as const },
    { key: 'z' as const, color: 'blue', label: 'Z', posKey: 'zPosition' as const, enabledKey: 'zEnabled' as const },
  ];

  const colorClasses = {
    red: {
      toggle: 'bg-red-400/20 border-red-400/40 text-red-300',
      track: '[&::-webkit-slider-thumb]:bg-red-400 [&::-webkit-slider-thumb]:shadow-red-400/30',
    },
    green: {
      toggle: 'bg-green-400/20 border-green-400/40 text-green-300',
      track: '[&::-webkit-slider-thumb]:bg-green-400 [&::-webkit-slider-thumb]:shadow-green-400/30',
    },
    blue: {
      toggle: 'bg-blue-400/20 border-blue-400/40 text-blue-300',
      track: '[&::-webkit-slider-thumb]:bg-blue-400 [&::-webkit-slider-thumb]:shadow-blue-400/30',
    },
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-3">
        <Scissors className="w-4 h-4 text-amber-400" />
        <h3 className="text-sm font-semibold text-amber-300 tracking-wide uppercase">
          切片控制
        </h3>
      </div>

      {axes.map(({ key, color, label, posKey, enabledKey }) => (
        <div key={key} className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSliceSettings({ [enabledKey]: !sliceSettings[enabledKey] })}
                className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold border transition-all ${
                  sliceSettings[enabledKey]
                    ? colorClasses[color].toggle
                    : 'bg-slate-800/50 border-slate-700/50 text-slate-600'
                }`}
              >
                {label}
              </button>
              <span className="text-xs text-slate-500">{label}轴切片</span>
            </div>
            {sliceSettings[enabledKey] && (
              <span className="text-xs font-mono text-slate-500">
                {sliceSettings[posKey].toFixed(1)} a₀
              </span>
            )}
          </div>
          {sliceSettings[enabledKey] && (
            <input
              type="range"
              min={-gridSize}
              max={gridSize}
              step={0.5}
              value={sliceSettings[posKey]}
              onChange={(e) => {
                const val = Number(e.target.value);
                const clamped = Math.max(-gridSize, Math.min(gridSize, val));
                setSliceSettings({ [posKey]: clamped });
              }}
              className={`w-full h-1.5 bg-slate-700 rounded-full appearance-none cursor-pointer ${colorClasses[color].track}
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5
                [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:shadow-lg`}
            />
          )}
        </div>
      ))}

      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
        <button
          onClick={() => setSliceSettings({ xEnabled: false, yEnabled: false, zEnabled: false })}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          全部关闭
        </button>
        <span className="text-slate-700">|</span>
        <button
          onClick={() => setSliceSettings({ xEnabled: true, yEnabled: true, zEnabled: true })}
          className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
        >
          全部开启
        </button>
      </div>
    </div>
  );
}
