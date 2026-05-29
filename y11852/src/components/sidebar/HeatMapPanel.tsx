import { useMemo } from 'react';
import { Panel } from '@/components/ui/Panel';
import { Button } from '@/components/ui/Button';
import { useDataStore } from '@/store/useDataStore';
import { getFrequencyColor, getFrequencyName, getMetricName, getMetricUnit } from '@/engine/acoustics';
import type { HeatMapMetric, FrequencyBand, Seat } from '@/types/acoustics';
import { Thermometer, Waves, Target } from 'lucide-react';

const getHeatMapGradient = (metric: HeatMapMetric): string[] => {
  return ['#3b82f6', '#22c55e', '#fbbf24', '#ef4444'];
};

const getValueRange = (metric: HeatMapMetric): [number, number] => {
  const ranges: Record<HeatMapMetric, [number, number]> = {
    rt60: [0.5, 3],
    spl: [60, 95],
    c80: [0, 15],
  };
  return ranges[metric];
};

export const HeatMapPanel = () => {
  const { seats, heatMapMetric, activeFrequencyBand, setHeatMapMetric, setActiveFrequencyBand } = useDataStore();

  const stats = useMemo(() => {
    if (seats.length === 0) return null;

    const values = seats
      .map((s) => s.acoustics[activeFrequencyBand][heatMapMetric])
      .filter((v): v is number => v !== null);

    if (values.length === 0) return null;

    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [seats, activeFrequencyBand, heatMapMetric]);

  const metrics: { key: HeatMapMetric; label: string; icon: typeof Thermometer }[] = [
    { key: 'rt60', label: '混响时间', icon: Thermometer },
    { key: 'spl', label: '声压级', icon: Waves },
    { key: 'c80', label: '清晰度', icon: Target },
  ];

  const gradient = getHeatMapGradient(heatMapMetric);
  const [min, max] = getValueRange(heatMapMetric);

  return (
    <Panel title="热力映射" icon={<Thermometer size={14} />} className="h-full flex flex-col">
      <div className="p-4 space-y-4">
        <div className="space-y-2">
          <div className="text-xs text-zinc-400 font-medium">显示指标</div>
          <div className="grid grid-cols-3 gap-1">
            {metrics.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setHeatMapMetric(key)}
                className={`flex flex-col items-center gap-1 p-2 rounded-lg text-xs transition-all ${
                  heatMapMetric === key
                    ? 'bg-blue-600/20 border border-blue-500/50 text-blue-400'
                    : 'bg-zinc-800/50 border border-transparent text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <Icon size={14} />
                <span className="font-medium">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-400 font-medium">频段选择</div>
          <div className="grid grid-cols-3 gap-1">
            {(['low', 'mid', 'high'] as FrequencyBand[]).map((band) => (
              <button
                key={band}
                onClick={() => setActiveFrequencyBand(band)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  activeFrequencyBand === band
                    ? 'text-white shadow-lg'
                    : 'bg-zinc-800/50 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
                style={{
                  backgroundColor: activeFrequencyBand === band ? getFrequencyColor(band) : undefined,
                  boxShadow: activeFrequencyBand === band ? `0 0 15px ${getFrequencyColor(band)}40` : undefined,
                }}
              >
                {getFrequencyName(band)}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs text-zinc-400 font-medium">颜色图例</div>
          <div className="relative h-8 rounded-lg overflow-hidden">
            <div
              className="absolute inset-0"
              style={{
                background: `linear-gradient(to right, ${gradient.join(', ')})`,
              }}
            />
            <div className="absolute inset-0 flex justify-between items-end px-2 pb-1">
              <span className="text-[10px] text-white/80 font-mono">{min}{getMetricUnit(heatMapMetric)}</span>
              <span className="text-[10px] text-white/80 font-mono">{max}{getMetricUnit(heatMapMetric)}</span>
            </div>
          </div>
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-zinc-500 mb-1">最小值</div>
              <div className="text-sm font-mono text-blue-400">
                {stats.min.toFixed(2)}
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-zinc-500 mb-1">平均值</div>
              <div className="text-sm font-mono text-emerald-400">
                {stats.avg.toFixed(2)}
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-lg p-2 text-center">
              <div className="text-[10px] text-zinc-500 mb-1">最大值</div>
              <div className="text-sm font-mono text-red-400">
                {stats.max.toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-zinc-800">
          <div className="text-xs text-zinc-400 font-medium mb-2">座位分布预览</div>
          <div className="grid grid-cols-20 gap-[1px] bg-zinc-800/30 p-1 rounded">
            {Array.from({ length: 15 * 20 }).map((_, idx) => {
              const row = Math.floor(idx / 20);
              const col = idx % 20;
              const seat = seats.find((s) => s.row === row && s.col === col);
              const value = seat?.acoustics[activeFrequencyBand][heatMapMetric];

              const normalized = value !== null
                ? Math.max(0, Math.min(1, ((value as number) - min) / (max - min)))
                : 0.5;

              const colorIndex = Math.min(gradient.length - 1, Math.floor(normalized * gradient.length));
              const color = value !== null ? gradient[colorIndex] : '#52525b';

              return (
                <div
                  key={idx}
                  className="aspect-square rounded-[2px] transition-colors"
                  style={{ backgroundColor: color, opacity: seat ? 0.9 : 0.2 }}
                  title={seat ? `${row + 1}排${col + 1}座: ${value?.toFixed(2)}${getMetricUnit(heatMapMetric)}` : undefined}
                />
              );
            })}
          </div>
        </div>
      </div>
    </Panel>
  );
};
