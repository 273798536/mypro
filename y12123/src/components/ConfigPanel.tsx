import { Settings, Sliders } from 'lucide-react';
import type { CalculationConfig, MemberState } from '../types';
import { MEMBER_STATE_LABELS } from '../types';

interface ConfigPanelProps {
  config: CalculationConfig;
  onConfigChange: (config: CalculationConfig) => void;
}

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const handleTimeWindowChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      timeWindowDays: parseInt(e.target.value) || 90,
    });
  };

  const handleThresholdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      churnThreshold: parseFloat(e.target.value) || 0.6,
    });
  };

  const handleColdStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onConfigChange({
      ...config,
      coldStartSampleSize: parseInt(e.target.value) || 50,
    });
  };

  const handleWeightChange = (key: 'probability' | 'value' | 'tenure', value: number) => {
    const newWeights = { ...config.weights, [key]: value };
    const total = Object.values(newWeights).reduce((sum, w) => sum + w, 0);

    if (total > 0) {
      Object.keys(newWeights).forEach(k => {
        newWeights[k as keyof typeof newWeights] =
          newWeights[k as keyof typeof newWeights] / total;
      });
    }

    onConfigChange({
      ...config,
      weights: newWeights,
    });
  };

  const handleStateToggle = (state: MemberState) => {
    const newStates = config.states.includes(state)
      ? config.states.filter(s => s !== state)
      : [...config.states, state];

    if (newStates.length >= 2) {
      onConfigChange({
        ...config,
        states: newStates,
      });
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 transition-all duration-300 hover:shadow-md">
      <div className="flex items-center gap-2 mb-4">
        <Settings className="w-5 h-5 text-slate-700" />
        <h3 className="font-semibold text-slate-800">模型配置</h3>
      </div>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            状态选择
          </label>
          <div className="flex flex-wrap gap-2">
            {(['active', 'inactive', 'dormant', 'churned', 'recalled'] as MemberState[]).map(state => (
              <button
                key={state}
                onClick={() => handleStateToggle(state)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all
                  ${config.states.includes(state)
                    ? 'bg-slate-700 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
              >
                {MEMBER_STATE_LABELS[state]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            分析时间窗口：{config.timeWindowDays} 天
          </label>
          <input
            type="range"
            min="30"
            max="365"
            step="1"
            value={config.timeWindowDays}
            onChange={handleTimeWindowChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>30天</span>
            <span>180天</span>
            <span>365天</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            流失阈值：{(config.churnThreshold * 100).toFixed(0)}%
          </label>
          <input
            type="range"
            min="0.3"
            max="0.9"
            step="0.05"
            value={config.churnThreshold}
            onChange={handleThresholdChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-red-500"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>30%</span>
            <span>60%</span>
            <span>90%</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            冷启动样本阈值：{config.coldStartSampleSize} 个会员
          </label>
          <input
            type="range"
            min="20"
            max="200"
            step="10"
            value={config.coldStartSampleSize}
            onChange={handleColdStartChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-500"
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sliders className="w-4 h-4 text-gray-500" />
            <label className="block text-sm font-medium text-gray-700">
              召回优先级权重
            </label>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">流失概率</span>
                <span className="font-medium text-slate-700">
                  {(config.weights.probability * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.weights.probability}
                onChange={(e) => handleWeightChange('probability', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-slate-700"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">会员价值</span>
                <span className="font-medium text-slate-700">
                  {(config.weights.value * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.weights.value}
                onChange={(e) => handleWeightChange('value', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-600">会员任期</span>
                <span className="font-medium text-slate-700">
                  {(config.weights.tenure * 100).toFixed(0)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={config.weights.tenure}
                onChange={(e) => handleWeightChange('tenure', parseFloat(e.target.value))}
                className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-emerald-500"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
