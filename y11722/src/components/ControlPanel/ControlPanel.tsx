import React from 'react';
import { ExperimentParams, AngleUnit, ForceDirection } from '../../types';
import { toDegrees } from '../../utils/physics';

interface ControlPanelProps {
  params: ExperimentParams;
  onParamsChange: (params: Partial<ExperimentParams>) => void;
  criticalAngle: number;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  params,
  onParamsChange,
  criticalAngle,
}) => {
  const criticalAngleDeg = toDegrees(criticalAngle);

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 space-y-6">
      <h2 className="text-xl font-bold text-slate-800 border-b pb-3">
        🎛️ 参数控制
      </h2>

      <div className="space-y-5">
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-700">斜面角度</label>
            <div className="flex items-center gap-2">
              <span className="text-lg font-mono font-bold text-primary-600">
                {params.angle.toFixed(1)}
                {params.angleUnit === 'degree' ? '°' : ' rad'}
              </span>
            </div>
          </div>
          <input
            type="range"
            min="0"
            max={params.angleUnit === 'degree' ? '90' : `${Math.PI / 2}`}
            step={params.angleUnit === 'degree' ? '1' : '0.01'}
            value={params.angle}
            onChange={(e) => onParamsChange({ angle: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent-500"
          />
          <div className="flex justify-between gap-2">
            <button
              onClick={() => onParamsChange({ angleUnit: params.angleUnit === 'degree' ? 'radian' : 'degree' })}
              className="text-xs px-3 py-1 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"
            >
              切换单位
            </button>
            <span className="text-xs text-slate-500">
              临界角: {criticalAngleDeg.toFixed(1)}°
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-700">摩擦系数 μ</label>
            <span className="text-lg font-mono font-bold text-primary-600">
              {params.frictionCoefficient.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.01"
            value={params.frictionCoefficient}
            onChange={(e) => onParamsChange({ frictionCoefficient: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent-500"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>0 (光滑)</span>
            <span>1.0</span>
            <span>2.0 (粗糙)</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-700">物块质量</label>
            <span className="text-lg font-mono font-bold text-primary-600">
              {params.mass.toFixed(1)} kg
            </span>
          </div>
          <input
            type="range"
            min="0.1"
            max="10"
            step="0.1"
            value={params.mass}
            onChange={(e) => onParamsChange({ mass: parseFloat(e.target.value) })}
            className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-accent-500"
          />
          <div className="flex justify-between text-xs text-slate-400">
            <span>0.1kg</span>
            <span>5kg</span>
            <span>10kg</span>
          </div>
        </div>

        <div className="border-t pt-4">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">外力设置</h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">外力大小</label>
                <span className="text-lg font-mono font-bold text-purple-600">
                  {params.externalForce.toFixed(1)} N
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="50"
                step="0.5"
                value={params.externalForce}
                onChange={(e) => onParamsChange({ externalForce: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-700">外力与斜面夹角</label>
                <span className="text-lg font-mono font-bold text-purple-600">
                  {params.externalForceAngle}°
                </span>
              </div>
              <input
                type="range"
                min="-90"
                max="90"
                step="5"
                value={params.externalForceAngle}
                onChange={(e) => onParamsChange({ externalForceAngle: parseFloat(e.target.value) })}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">外力方向</label>
              <div className="flex gap-2">
                {(['up', 'down', 'horizontal'] as ForceDirection[]).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => onParamsChange({ externalForceDirection: dir })}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      params.externalForceDirection === dir
                        ? 'bg-purple-500 text-white shadow-md'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {dir === 'up' ? '↑ 向上' : dir === 'down' ? '↓ 向下' : '→ 水平'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
