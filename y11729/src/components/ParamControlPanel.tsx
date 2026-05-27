import React from 'react';
import { Settings, RotateCcw, Play } from 'lucide-react';
import { ParamSlider } from './ParamSlider';
import { WarningBanner } from './WarningBanner';
import { DEFAULT_PARAMS } from '../physics';
import type { SimulationParams, Warning as WarningType } from '../physics';

interface ParamControlPanelProps {
  params: SimulationParams;
  onChange: (params: SimulationParams) => void;
  onRunSimulation: () => void;
  validationWarnings: WarningType[];
  hasErrors: boolean;
}

export const ParamControlPanel: React.FC<ParamControlPanelProps> = ({
  params,
  onChange,
  onRunSimulation,
  validationWarnings,
  hasErrors,
}) => {
  const handleParamChange = (key: keyof SimulationParams, value: number) => {
    onChange({ ...params, [key]: value });
  };

  const handleReset = () => {
    onChange(DEFAULT_PARAMS);
  };

  const angleError = validationWarnings.some((w) => w.type === 'ANGLE_OUT_OF_RANGE');

  return (
    <div className="bg-gray-800/50 backdrop-blur rounded-xl p-5 border border-gray-700 h-full flex flex-col">
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-green-400" />
          <h2 className="text-lg font-bold text-white">参数设置</h2>
        </div>
        <button
          onClick={handleReset}
          className="flex items-center gap-1 px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          重置
        </button>
      </div>

      <WarningBanner warnings={validationWarnings} />

      <div className="flex-1 overflow-y-auto pr-1 space-y-1">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-2">
          弹道参数
        </h3>
        <ParamSlider
          paramKey="initialVelocity"
          value={params.initialVelocity}
          onChange={handleParamChange}
          label="初速度"
          unit="m/s"
        />
        <ParamSlider
          paramKey="launchAngle"
          value={params.launchAngle}
          onChange={handleParamChange}
          label="发射角"
          unit="°"
          hasError={angleError}
        />
        <ParamSlider
          paramKey="targetDistance"
          value={params.targetDistance}
          onChange={handleParamChange}
          label="靶距"
          unit="m"
        />

        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6">
          箭矢属性
        </h3>
        <ParamSlider
          paramKey="arrowMass"
          value={params.arrowMass}
          onChange={handleParamChange}
          label="箭重"
          unit="g"
        />
        <ParamSlider
          paramKey="dragCoefficient"
          value={params.dragCoefficient}
          onChange={handleParamChange}
          label="阻力系数"
          unit=""
        />

        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 mt-6">
          计算设置
        </h3>
        <ParamSlider
          paramKey="timeStep"
          value={params.timeStep}
          onChange={handleParamChange}
          label="积分步长"
          unit="s"
        />
      </div>

      <button
        onClick={onRunSimulation}
        disabled={hasErrors}
        className={`w-full mt-4 py-3 px-4 rounded-lg font-semibold flex items-center justify-center gap-2 transition-all ${
          hasErrors
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-lg shadow-green-500/25'
        }`}
      >
        <Play className="w-5 h-5" />
        {hasErrors ? '请修正参数错误' : '运行模拟'}
      </button>
    </div>
  );
};
