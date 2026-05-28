import React from 'react';
import { Settings, BookOpen, History } from 'lucide-react';
import { ParameterSlider } from './ParameterSlider';
import { useSimulationStore } from '../store/simulationStore';
import { PARAMETER_RANGES } from '../types/simulation';

export const ParameterPanel: React.FC = () => {
  const { params, setParam, setParams } = useSimulationStore();

  const handleParamChange = (key: keyof typeof PARAMETER_RANGES, value: number) => {
    setParam(key, value);
  };

  const handleSourceChange = (source: string) => {
    setParams({ source });
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 border border-slate-100">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-blue-100 rounded-xl">
          <Settings className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800">模拟参数</h2>
          <p className="text-xs text-slate-500">调整雨滴下落的物理参数</p>
        </div>
      </div>

      <ParameterSlider
        label="雨滴半径"
        value={params.radius}
        min={0.05}
        max={10}
        step={0.05}
        unit="mm"
        onChange={(v) => handleParamChange('radius', v)}
        paramKey="radius"
      />

      <ParameterSlider
        label="空气密度"
        value={params.airDensity}
        min={0.5}
        max={1.5}
        step={0.01}
        unit="kg/m³"
        onChange={(v) => handleParamChange('airDensity', v)}
        paramKey="airDensity"
      />

      <ParameterSlider
        label="阻力系数"
        value={params.dragCoefficient}
        min={0.2}
        max={1.0}
        step={0.01}
        unit=""
        onChange={(v) => handleParamChange('dragCoefficient', v)}
        paramKey="dragCoefficient"
      />

      <ParameterSlider
        label="初速度"
        value={params.initialVelocity}
        min={-50}
        max={50}
        step={1}
        unit="m/s"
        onChange={(v) => handleParamChange('initialVelocity', v)}
        paramKey="initialVelocity"
      />

      <ParameterSlider
        label="下落高度"
        value={params.height}
        min={100}
        max={5000}
        step={100}
        unit="m"
        onChange={(v) => handleParamChange('height', v)}
        paramKey="height"
      />

      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-slate-500" />
          <span className="text-sm font-medium text-slate-700">数据来源</span>
        </div>
        <input
          type="text"
          value={params.source}
          onChange={(e) => handleSourceChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent"
          placeholder="输入数据来源..."
        />
      </div>

      {params.modificationHistory.length > 0 && (
        <div className="mt-4 pt-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <History className="w-4 h-4 text-slate-500" />
            <span className="text-sm font-medium text-slate-700">修改记录</span>
          </div>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {params.modificationHistory.slice(-5).reverse().map((record, index) => (
              <div key={index} className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded">
                {record.field}: {record.oldValue} → {record.newValue}
                <span className="text-slate-400 ml-1">({record.reason})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
