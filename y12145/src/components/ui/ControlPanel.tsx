import { useSolarSailStore } from '@/store/solarSailStore';
import { Maximize2, Weight, RotateCw, Clock } from 'lucide-react';

export function ControlPanel() {
  const { params, setParams, loadSampleData } = useSolarSailStore();

  return (
    <div className="bg-slate-800/90 backdrop-blur-sm rounded-xl p-5 border border-slate-700">
      <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
        参数控制
      </h2>

      <div className="space-y-5">
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <Maximize2 className="w-4 h-4 text-teal-400" />
              帆面积
            </label>
            <span className="font-mono text-teal-400 text-sm">{params.sailArea.toFixed(1)} m²</span>
          </div>
          <input
            type="range"
            min="1"
            max="1000"
            step="1"
            value={params.sailArea}
            onChange={(e) => setParams({ sailArea: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1</span>
            <span>1000</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <Weight className="w-4 h-4 text-orange-400" />
              航天器质量
            </label>
            <span className="font-mono text-orange-400 text-sm">{params.spacecraftMass.toFixed(1)} kg</span>
          </div>
          <input
            type="range"
            min="0"
            max="500"
            step="1"
            value={params.spacecraftMass}
            onChange={(e) => setParams({ spacecraftMass: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0</span>
            <span>500</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <RotateCw className="w-4 h-4 text-cyan-400" />
              姿态角
            </label>
            <span className="font-mono text-cyan-400 text-sm">{params.attitudeAngle.toFixed(1)}°</span>
          </div>
          <input
            type="range"
            min="-10"
            max="100"
            step="1"
            value={params.attitudeAngle}
            onChange={(e) => setParams({ attitudeAngle: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>-10</span>
            <span>100</span>
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm text-slate-300">
              <Clock className="w-4 h-4 text-purple-400" />
              时间步长
            </label>
            <span className="font-mono text-purple-400 text-sm">{params.timeStep.toFixed(0)} s</span>
          </div>
          <input
            type="range"
            min="1"
            max="7200"
            step="10"
            value={params.timeStep}
            onChange={(e) => setParams({ timeStep: Number(e.target.value) })}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer slider"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>1s</span>
            <span>7200s</span>
          </div>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-slate-700">
        <p className="text-xs text-slate-400 mb-3">快速加载样例：</p>
        <div className="flex gap-2">
          <button
            onClick={() => loadSampleData('normal')}
            className="flex-1 py-2 px-3 bg-teal-600 hover:bg-teal-500 text-white text-sm rounded-lg transition-colors"
          >
            正常记录
          </button>
          <button
            onClick={() => loadSampleData('zeroMass')}
            className="flex-1 py-2 px-3 bg-red-600/80 hover:bg-red-500 text-white text-sm rounded-lg transition-colors"
          >
            质量为零
          </button>
        </div>
      </div>
    </div>
  );
}
