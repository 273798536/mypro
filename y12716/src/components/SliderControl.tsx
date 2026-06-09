import { useCallback } from 'react';
import { RotateCcw } from 'lucide-react';
import type { ErrorToleranceConfig } from '@/types';
import { DEFAULT_ERROR_TOLERANCE } from '@/types';
import { useAppStore } from '@/store/useAppStore';

interface SliderConfig {
  key: keyof ErrorToleranceConfig;
  label: string;
  symbol: string;
  min: number;
  max: number;
  step: number;
  description: string;
  unit?: string;
}

const sliderConfigs: SliderConfig[] = [
  {
    key: 'difficultyWeight',
    label: '难度权重',
    symbol: 'w₁',
    min: 0,
    max: 1,
    step: 0.01,
    description: '归一化难度在综合评分中的占比',
    unit: '',
  },
  {
    key: 'errorRateWeight',
    label: '错题率权重',
    symbol: 'w₂',
    min: 0,
    max: 1,
    step: 0.01,
    description: '学生错题率在综合评分中的占比',
    unit: '',
  },
  {
    key: 'dependencyPenaltyWeight',
    label: '依赖深度惩罚权重',
    symbol: 'w₃',
    min: 0,
    max: 1,
    step: 0.01,
    description: '前置依赖层数惩罚的占比',
    unit: '',
  },
  {
    key: 'chapterOrderWeight',
    label: '章节顺序权重',
    symbol: 'w₄',
    min: 0,
    max: 1,
    step: 0.01,
    description: '靠前章节优先发布的权重',
    unit: '',
  },
  {
    key: 'batchSize',
    label: '每批题数',
    symbol: 'N',
    min: 1,
    max: 15,
    step: 1,
    description: '每个发布批次包含的题目数量',
    unit: '题',
  },
  {
    key: 'daysPerBatch',
    label: '批次间隔',
    symbol: 'ΔT',
    min: 1,
    max: 14,
    step: 1,
    description: '相邻两个发布批次之间的天数间隔',
    unit: '天',
  },
];

export function SliderControl() {
  const { config, updateConfig, resetConfig } = useAppStore();

  const handleChange = useCallback(
    (key: keyof ErrorToleranceConfig, value: number) => {
      updateConfig({ [key]: value });
    },
    [updateConfig],
  );

  const totalWeight =
    config.difficultyWeight +
    config.errorRateWeight +
    config.dependencyPenaltyWeight +
    config.chapterOrderWeight;

  const isNormal = Math.abs(totalWeight - 1) < 0.01;

  return (
    <div className="rounded-lg border border-[#2a4a73] bg-[#0f2138] text-white overflow-hidden">
      <div className="flex items-center justify-between border-b border-[#2a4a73] bg-[#173252] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-serif text-lg font-semibold">误差参数调整</span>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] ${
              isNormal ? 'bg-[#2d936c]/20 text-[#7bc9a7]' : 'bg-[#c85353]/20 text-[#e99090]'
            }`}
          >
            权重和：{totalWeight.toFixed(2)}
          </span>
        </div>
        <button
          onClick={resetConfig}
          className="inline-flex items-center gap-1 rounded border border-[#2a4a73] bg-[#1e3a5f] px-2 py-1 text-xs text-gray-300 transition-colors hover:border-[#d4a24c] hover:text-[#d4a24c]"
        >
          <RotateCcw className="h-3 w-3" />
          重置默认
        </button>
      </div>

      <div className="space-y-4 p-4">
        {sliderConfigs.map((cfg) => {
          const value = config[cfg.key] as number;
          const defaultValue = DEFAULT_ERROR_TOLERANCE[cfg.key] as number;
          const isChanged = Math.abs(value - defaultValue) > 0.0001;

          return (
            <div key={cfg.key}>
              <div className="mb-1.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#1e3a5f] px-1.5 py-0.5 font-mono text-[11px] text-[#d4a24c]">
                    {cfg.symbol}
                  </span>
                  <span className="text-sm text-gray-200">{cfg.label}</span>
                  {isChanged && (
                    <span className="rounded-full bg-[#4a8ec2]/20 px-1.5 py-0.5 text-[9px] text-[#4a8ec2]">
                      已调整
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-sm text-[#d4a24c]">{value.toFixed(cfg.step < 1 ? 2 : 0)}</span>
                  {cfg.unit && <span className="text-xs text-gray-500">{cfg.unit}</span>}
                </div>
              </div>
              <input
                type="range"
                min={cfg.min}
                max={cfg.max}
                step={cfg.step}
                value={value}
                onChange={(e) => handleChange(cfg.key, Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none bg-[#1e3a5f] accent-[#d4a24c] cursor-pointer"
              />
              <div className="mt-1 flex justify-between text-[10px] text-gray-500">
                <span>{cfg.min}</span>
                <span className="text-gray-400">{cfg.description}</span>
                <span>
                  默认：{defaultValue.toFixed(cfg.step < 1 ? 2 : 0)}
                  {cfg.unit}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
