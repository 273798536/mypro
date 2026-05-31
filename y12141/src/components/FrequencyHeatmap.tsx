import { FREQUENCY_BANDS } from '@/types';
import type { FrequencyBand, RoadNoiseSource, AcousticMaterial } from '@/types';

interface FrequencyHeatmapProps {
  sources: RoadNoiseSource[];
  materials: AcousticMaterial[];
  onCellClick?: (type: 'source' | 'material', id: string, band: FrequencyBand) => void;
}

export const FrequencyHeatmap = ({ sources, materials, onCellClick }: FrequencyHeatmapProps) => {
  const allItems = [
    ...sources.map((s) => ({ type: 'source' as const, id: s.id, name: s.name, data: s.spectrum })),
    ...materials.map((m) => ({
      type: 'material' as const,
      id: m.id,
      name: m.name,
      data: m.transmissionLoss,
    })),
  ];

  const getCellColor = (value: number | null) => {
    if (value === null) return 'bg-accent-red';
    if (value < 30) return 'bg-accent-orange';
    if (value < 60) return 'bg-yellow-500';
    return 'bg-accent-green';
  };

  const getOpacity = (value: number | null) => {
    if (value === null) return '100';
    const normalized = Math.min(1, value / 100);
    return String(30 + normalized * 70);
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-primary-700">
            <th className="text-left py-3 px-4 text-sm font-medium text-primary-400 sticky left-0 bg-primary-900 min-w-[200px] z-10">
              数据源
            </th>
            {FREQUENCY_BANDS.map((band) => (
              <th
                key={band}
                className="text-center py-3 px-2 text-sm font-medium text-primary-400 min-w-[60px]"
              >
                <div className="font-mono">{band}</div>
                <div className="text-[10px] text-primary-500">Hz</div>
              </th>
            ))}
            <th className="text-center py-3 px-2 text-sm font-medium text-primary-400 min-w-[80px]">
              完整度
            </th>
          </tr>
        </thead>
        <tbody>
          {allItems.map((item, idx) => {
            const completeCount = FREQUENCY_BANDS.filter(
              (band) => item.data[band] !== null
            ).length;
            const coverage = Math.round((completeCount / FREQUENCY_BANDS.length) * 100);

            return (
              <tr
                key={`${item.type}-${item.id}`}
                className={`border-b border-primary-800 ${
                  idx % 2 === 0 ? 'bg-primary-900/50' : ''
                } hover:bg-primary-800/30`}
              >
                <td className="py-3 px-4 sticky left-0 bg-inherit z-10">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        item.type === 'source'
                          ? 'bg-accent-blue/20 text-accent-blue'
                          : 'bg-accent-orange/20 text-accent-orange'
                      }`}
                    >
                      {item.type === 'source' ? '道路' : '材料'}
                    </span>
                    <span className="text-sm text-white truncate max-w-[140px]">{item.name}</span>
                  </div>
                </td>
                {FREQUENCY_BANDS.map((band) => {
                  const value = item.data[band];
                  return (
                    <td key={band} className="py-2 px-1 text-center">
                      <button
                        onClick={() => onCellClick?.(item.type, item.id, band)}
                        className={`w-10 h-10 rounded ${getCellColor(value)} opacity-${getOpacity(
                          value
                        )} hover:ring-2 hover:ring-white/50 transition-all flex items-center justify-center`}
                        title={value === null ? '数据缺失' : String(value)}
                      >
                        {value === null ? (
                          <span className="text-white text-xs font-bold">?</span>
                        ) : (
                          <span className="text-white/80 text-[10px] font-mono">
                            {value.toFixed(0)}
                          </span>
                        )}
                      </button>
                    </td>
                  );
                })}
                <td className="py-2 px-2 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      coverage === 100
                        ? 'bg-accent-green/20 text-accent-green'
                        : coverage >= 75
                        ? 'bg-accent-orange/20 text-accent-orange'
                        : 'bg-accent-red/20 text-accent-red'
                    }`}
                  >
                    {coverage}%
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="flex items-center gap-6 mt-4 pt-4 border-t border-primary-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-accent-red" />
          <span className="text-xs text-primary-400">缺失</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-accent-orange" />
          <span className="text-xs text-primary-400">低 &lt;30 dB</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span className="text-xs text-primary-400">中 30-60 dB</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-accent-green" />
          <span className="text-xs text-primary-400">高 &gt;60 dB</span>
        </div>
      </div>
    </div>
  );
};
