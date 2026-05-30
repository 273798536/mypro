import { useSimulationStore } from '@/store/useSimulationStore';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface ParamDef {
  key: keyof import('@/types').SimulationParams;
  label: string;
  unit: string;
  min: number;
  max: number;
  step: number;
  direction: 'up' | 'down' | 'neutral';
  hint: string;
}

const PARAMS: ParamDef[] = [
  { key: 'deductible', label: '免赔额', unit: '元', min: 0, max: 200000, step: 1000, direction: 'down', hint: '↑免赔 → ↓纯保费' },
  { key: 'limit', label: '限额', unit: '元', min: 10000, max: 5000000, step: 10000, direction: 'up', hint: '↑限额 → ↑纯保费' },
  { key: 'expenseRatio', label: '费用率', unit: '%', min: 0.05, max: 0.6, step: 0.01, direction: 'neutral', hint: '↑费用率 → ↑毛保费' },
  { key: 'safetyLoading', label: '安全加载', unit: '%', min: 0, max: 0.5, step: 0.01, direction: 'up', hint: '↑加载 → ↑毛保费' },
  { key: 'iterations', label: '模拟次数', unit: '次', min: 1000, max: 50000, step: 1000, direction: 'neutral', hint: '↑次数 → ↑精度' },
];

function DirectionIcon({ direction }: { direction: 'up' | 'down' | 'neutral' }) {
  if (direction === 'up') return <TrendingUp className="w-3 h-3 text-accent" />;
  if (direction === 'down') return <TrendingDown className="w-3 h-3 text-warn" />;
  return <Minus className="w-3 h-3 text-gray-500" />;
}

export default function ParamConfig() {
  const { params, updateParams } = useSimulationStore();

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">模拟参数</h2>
      <div className="space-y-3">
        {PARAMS.map((def) => {
          const value = params[def.key];
          const displayValue = def.key === 'expenseRatio' || def.key === 'safetyLoading'
            ? (value * 100).toFixed(0)
            : value.toLocaleString();

          return (
            <div key={def.key} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <DirectionIcon direction={def.direction} />
                  <span className="text-xs font-medium text-gray-400">{def.label}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-mono text-sm text-white">{displayValue}</span>
                  <span className="text-[10px] text-gray-500">{def.unit}</span>
                </div>
              </div>
              <input
                type="range"
                min={def.min}
                max={def.max}
                step={def.step}
                value={value}
                onChange={(e) => updateParams({ [def.key]: Number(e.target.value) })}
                className="w-full h-1.5 bg-surface-200 rounded-full appearance-none cursor-pointer
                  [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5
                  [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-accent [&::-webkit-slider-thumb]:cursor-pointer
                  [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(16,185,129,0.4)]"
              />
              <div className="text-[10px] text-gray-600 font-mono">{def.hint}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
