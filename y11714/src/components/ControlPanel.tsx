import React from 'react';
import { GROUND_MATERIALS, GroundMaterial } from '../types';
import { ExperimentParamsValidation } from '../utils/validation';

interface ControlPanelProps {
  ballMass: number;
  setBallMass: (mass: number) => void;
  groundMaterial: string;
  setGroundMaterial: (material: string) => void;
  restitution: number;
  setRestitution: (restitution: number) => void;
  timeScale: number;
  setTimeScale: (scale: number) => void;
  isRunning: boolean;
  isPaused: boolean;
  hasResult: boolean;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onReset: () => void;
  onStep: () => void;
  onSave: () => void;
  onScreenshot: () => void;
  validation: ExperimentParamsValidation;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  ballMass,
  setBallMass,
  groundMaterial,
  setGroundMaterial,
  restitution,
  setRestitution,
  timeScale,
  setTimeScale,
  isRunning,
  isPaused,
  hasResult,
  onStart,
  onPause,
  onResume,
  onReset,
  onStep,
  onSave,
  onScreenshot,
  validation,
}) => {
  const selectedMaterial = GROUND_MATERIALS.find((m) => m.id === groundMaterial);

  return (
    <div className="bg-slate-800 rounded-xl p-5 space-y-5 shadow-xl">
      <h3 className="text-lg font-bold text-cyan-400 border-b border-slate-700 pb-2">
        ⚙️ 实验参数
      </h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            小球质量 (kg)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min="0.001"
              max="10"
              step="0.001"
              value={ballMass}
              onChange={(e) => setBallMass(parseFloat(e.target.value))}
              disabled={isRunning}
              className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <input
              type="number"
              min="0.001"
              max="10"
              step="0.001"
              value={ballMass}
              onChange={(e) => setBallMass(parseFloat(e.target.value) || 0.001)}
              disabled={isRunning}
              className="w-20 px-2 py-1 bg-slate-700 border border-slate-600 rounded text-white text-sm text-center focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          {!validation.ballMass.isValid && (
            <p className="text-red-400 text-xs mt-1">{validation.ballMass.errors[0]}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            地面材质
          </label>
          <select
            value={groundMaterial}
            onChange={(e) => setGroundMaterial(e.target.value)}
            disabled={isRunning}
            className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
          >
            {GROUND_MATERIALS.map((material) => (
              <option key={material.id} value={material.id}>
                {material.name} (e ≈ {material.restitution})
              </option>
            ))}
          </select>
          {selectedMaterial && (
            <div className="flex items-center gap-2 mt-2">
              <div
                className="w-6 h-6 rounded border border-slate-500"
                style={{ backgroundColor: selectedMaterial.color }}
              />
              <span className="text-xs text-slate-400">
                预设恢复系数: {selectedMaterial.restitution}
              </span>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            恢复系数 (自定义): {restitution.toFixed(3)}
          </label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={restitution}
            onChange={(e) => setRestitution(parseFloat(e.target.value))}
            disabled={isRunning}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0 (完全非弹性)</span>
            <span>1 (完全弹性)</span>
          </div>
          {!validation.restitution.isValid && (
            <p className="text-red-400 text-xs mt-1">{validation.restitution.errors[0]}</p>
          )}
        </div>
      </div>

      <div className="border-t border-slate-700 pt-4">
        <h4 className="text-sm font-medium text-slate-300 mb-3">⏱️ 播放控制</h4>
        
        <div className="mb-4">
          <label className="block text-xs text-slate-400 mb-2">
            播放速度: {timeScale.toFixed(1)}x
          </label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={timeScale}
            onChange={(e) => setTimeScale(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
          <div className="flex justify-between text-xs text-slate-500 mt-1">
            <span>0.1x (慢放)</span>
            <span>1x (正常)</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {!isRunning ? (
            <button
              onClick={onStart}
              className="col-span-2 py-2 px-4 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-all transform hover:scale-105 active:scale-95"
            >
              ▶ 开始实验
            </button>
          ) : (
            <>
              {!isPaused ? (
                <button
                  onClick={onPause}
                  className="col-span-2 py-2 px-4 bg-yellow-600 hover:bg-yellow-500 text-white font-medium rounded-lg transition-all"
                >
                  ⏸ 暂停
                </button>
              ) : (
                <button
                  onClick={onResume}
                  className="col-span-2 py-2 px-4 bg-green-600 hover:bg-green-500 text-white font-medium rounded-lg transition-all"
                >
                  ▶ 继续
                </button>
              )}
            </>
          )}
          <button
            onClick={onReset}
            className="py-2 px-4 bg-slate-600 hover:bg-slate-500 text-white font-medium rounded-lg transition-all"
          >
            ↺ 重置
          </button>
        </div>

        {isRunning && isPaused && (
          <button
            onClick={onStep}
            className="w-full mt-2 py-2 px-4 bg-cyan-600 hover:bg-cyan-500 text-white font-medium rounded-lg transition-all"
          >
            ⏭ 单步前进
          </button>
        )}
      </div>

      {hasResult && (
        <div className="border-t border-slate-700 pt-4 space-y-2">
          <button
            onClick={onSave}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg transition-all"
          >
            💾 保存实验记录
          </button>
          <button
            onClick={onScreenshot}
            className="w-full py-2 px-4 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded-lg transition-all"
          >
            📸 导出截图
          </button>
        </div>
      )}
    </div>
  );
};
