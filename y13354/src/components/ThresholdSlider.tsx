import { useGatekeeperStore } from '@/store/gatekeeper';
import type { MetricResult } from '@/types';

interface Props {
  metricKey: string;
  metric: MetricResult;
}

export default function ThresholdSlider({ metricKey, metric }: Props) {
  const { customThresholds, setThreshold, metricConfigs } = useGatekeeperStore();
  const config = metricConfigs.find((c) => c.key === metricKey);
  const min = config?.minValue ?? 0;
  const max = config?.maxValue ?? metric.threshold * 2;
  const currentThreshold = customThresholds[metricKey] ?? metric.threshold;
  const step = metric.unit === '%' ? 0.5 : metric.unit === '' ? 0.01 : 10;

  const percent = ((currentThreshold - min) / (max - min)) * 100;
  const valuePercent = ((metric.value - min) / (max - min)) * 100;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>边界值调整</span>
        <span className="font-mono text-slate-300">
          {metric.passCondition} {currentThreshold}
        </span>
      </div>
      <div className="relative h-2 rounded-full bg-slate-700">
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-blue-500/40"
          style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
        />
        <div
          className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 bg-emerald-400"
          style={{ left: `${Math.min(100, Math.max(0, valuePercent))}%` }}
          title={`当前值: ${metric.value}`}
        >
          <div className="absolute -top-1 left-1/2 h-3 w-0.5 -translate-x-1/2 bg-emerald-400" />
        </div>
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={currentThreshold}
          onChange={(e) => setThreshold(metricKey, Number(e.target.value))}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
        <div
          className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-blue-400 bg-white shadow-md"
          style={{ left: `${Math.min(100, Math.max(0, percent))}%` }}
        />
      </div>
      <div className="flex justify-between text-[9px] text-slate-600">
        <span>{min}</span>
        <span className="text-emerald-500">当前值 →</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
