import { useExperimentStore } from '../../store/useExperimentStore';
import { PARAM_BOUNDS } from '../../utils/physics';

export function EnvironmentSettings() {
  const settings = useExperimentStore((state) => state.settings);
  const updateSettings = useExperimentStore((state) => state.updateSettings);

  return (
    <div className="bg-space-800 rounded-lg p-4 border border-space-700">
      <h3 className="text-sm font-medium text-white/70 mb-3">环境设置</h3>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-sm mb-1">
            <span>摩擦系数</span>
            <span className="mono-text text-cyber-400">
              {settings.friction.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min={PARAM_BOUNDS.friction.min}
            max={PARAM_BOUNDS.friction.max}
            step={0.01}
            value={settings.friction}
            onChange={(e) =>
              updateSettings(
                { friction: parseFloat(e.target.value) },
                '环境设置面板'
              )
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-white/40">
            <span>无摩擦</span>
            <span>高摩擦</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="text-xs">
            <div className="text-white/50 mb-1">台面宽度</div>
            <div className="mono-text">{settings.tableWidth.toFixed(1)} m</div>
          </div>
          <div className="text-xs">
            <div className="text-white/50 mb-1">台面高度</div>
            <div className="mono-text">{settings.tableHeight.toFixed(1)} m</div>
          </div>
        </div>
      </div>
    </div>
  );
}
