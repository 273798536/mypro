import { Wind } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export function WindParams() {
  const { currentWindParams, setWindParams } = useAppStore();

  return (
    <div className="bg-slate-800/80 rounded-lg p-4 backdrop-blur-sm border border-slate-700">
      <div className="flex items-center gap-2 mb-4">
        <Wind className="w-5 h-5 text-cyan-400" />
        <h3 className="text-white font-semibold">风向参数</h3>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between mb-1">
            <label className="text-slate-300 text-sm">风速</label>
            <span className="text-cyan-400 font-mono text-sm">
              {currentWindParams.speed} m/s
            </span>
          </div>
          <input
            type="range"
            min="10"
            max="100"
            value={currentWindParams.speed}
            onChange={(e) => setWindParams({ speed: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>10</span>
            <span>100</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-slate-300 text-sm">偏航角 (Yaw)</label>
            <span className="text-cyan-400 font-mono text-sm">
              {currentWindParams.yawAngle}°
            </span>
          </div>
          <input
            type="range"
            min="-90"
            max="90"
            value={currentWindParams.yawAngle}
            onChange={(e) => setWindParams({ yawAngle: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>-90°</span>
            <span>0°</span>
            <span>90°</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-slate-300 text-sm">俯仰角 (Pitch)</label>
            <span className="text-cyan-400 font-mono text-sm">
              {currentWindParams.pitchAngle}°
            </span>
          </div>
          <input
            type="range"
            min="-45"
            max="45"
            value={currentWindParams.pitchAngle}
            onChange={(e) => setWindParams({ pitchAngle: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>-45°</span>
            <span>0°</span>
            <span>45°</span>
          </div>
        </div>

        <div>
          <div className="flex justify-between mb-1">
            <label className="text-slate-300 text-sm">空气密度</label>
            <span className="text-cyan-400 font-mono text-sm">
              {currentWindParams.density} kg/m³
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.05"
            value={currentWindParams.density}
            onChange={(e) => setWindParams({ density: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0.5</span>
            <span>1.225</span>
            <span>2.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
