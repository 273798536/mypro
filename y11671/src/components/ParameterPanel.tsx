import { Settings, RotateCcw, Plus, Minus } from 'lucide-react';
import { useSimulationStore } from '../store/simulationStore';
import { PRESETS } from '../utils/presets';

export function ParameterPanel() {
  const pendulums = useSimulationStore(state => state.pendulums);
  const couplingParams = useSimulationStore(state => state.couplingParams);
  const warnings = useSimulationStore(state => state.warnings);
  const setCouplingParam = useSimulationStore(state => state.setCouplingParam);
  const setPendulumParam = useSimulationStore(state => state.setPendulumParam);
  const loadPreset = useSimulationStore(state => state.loadPreset);
  const addPendulum = useSimulationStore(state => state.addPendulum);
  const removePendulum = useSimulationStore(state => state.removePendulum);
  const clearWarnings = useSimulationStore(state => state.clearWarnings);

  return (
    <div className="h-full flex flex-col bg-slate-900/90 border-r border-slate-700/50">
      <div className="p-4 border-b border-slate-700/50">
        <div className="flex items-center gap-2 text-cyan-400 mb-4">
          <Settings className="w-5 h-5" />
          <h2 className="text-lg font-semibold tracking-wide">参数控制</h2>
        </div>

        <div className="mb-4">
          <label className="text-sm text-slate-400 mb-2 block">预设配置</label>
          <select
            className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-200 focus:border-cyan-500 focus:outline-none"
            onChange={(e) => loadPreset(Number(e.target.value))}
            defaultValue="0"
          >
            {PRESETS.map((preset, index) => (
              <option key={index} value={index}>
                {preset.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 mb-4">
          <button
            onClick={addPendulum}
            disabled={pendulums.length >= 8}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-slate-200 transition-colors"
          >
            <Plus className="w-4 h-4" />
            添加摆
          </button>
          <button
            onClick={() => pendulums.length > 0 && removePendulum(pendulums[pendulums.length - 1].id)}
            disabled={pendulums.length <= 2}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm text-slate-200 transition-colors"
          >
            <Minus className="w-4 h-4" />
            移除摆
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">耦合系统参数</h3>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">耦合系数</span>
                <span className="text-cyan-300">{couplingParams.couplingCoeff.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="0.1"
                value={couplingParams.couplingCoeff}
                onChange={(e) => setCouplingParam('couplingCoeff', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">时间步长 (s)</span>
                <span className="text-cyan-300">{couplingParams.timeStep.toFixed(4)}</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.05"
                step="0.0005"
                value={couplingParams.timeStep}
                onChange={(e) => setCouplingParam('timeStep', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">阻尼系数</span>
                <span className="text-cyan-300">{couplingParams.damping.toFixed(3)}</span>
              </div>
              <input
                type="range"
                min="0"
                max="2"
                step="0.01"
                value={couplingParams.damping}
                onChange={(e) => setCouplingParam('damping', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-slate-400">重力加速度 (m/s²)</span>
                <span className="text-cyan-300">{couplingParams.gravity.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="1"
                max="20"
                step="0.1"
                value={couplingParams.gravity}
                onChange={(e) => setCouplingParam('gravity', Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-4">
          <h3 className="text-sm font-semibold text-cyan-400 mb-3">各摆参数</h3>
          <div className="space-y-4">
            {pendulums.map((pendulum) => (
              <div key={pendulum.id} className="border-b border-slate-700/50 pb-3 last:border-0">
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: pendulum.color }}
                  />
                  <span className="text-sm font-medium text-slate-200">摆 {pendulum.id + 1}</span>
                </div>

                <div className="space-y-2">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">摆长 (m)</span>
                      <span className="text-slate-300">{pendulum.length.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.3"
                      max="3"
                      step="0.05"
                      value={pendulum.length}
                      onChange={(e) => setPendulumParam(pendulum.id, 'length', Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">质量 (kg)</span>
                      <span className="text-slate-300">{pendulum.mass.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.1"
                      max="5"
                      step="0.1"
                      value={pendulum.mass}
                      onChange={(e) => setPendulumParam(pendulum.id, 'mass', Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-500">初始角度 (rad)</span>
                      <span className="text-slate-300">{pendulum.initialAngle.toFixed(3)}</span>
                    </div>
                    <input
                      type="range"
                      min={-Math.PI / 2}
                      max={Math.PI / 2}
                      step="0.01"
                      value={pendulum.initialAngle}
                      onChange={(e) => setPendulumParam(pendulum.id, 'initialAngle', Number(e.target.value))}
                      className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {warnings.length > 0 && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-amber-400">参数警告</span>
              <button
                onClick={clearWarnings}
                className="text-xs text-amber-300 hover:text-amber-200"
              >
                清除
              </button>
            </div>
            <ul className="space-y-1">
              {warnings.map((warning, index) => (
                <li key={index} className="text-xs text-amber-300/80">
                  • {warning}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
