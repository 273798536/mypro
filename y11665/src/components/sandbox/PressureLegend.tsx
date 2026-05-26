import { useWaterStore } from '@/store/useWaterStore';
import { Palette } from 'lucide-react';

export default function PressureLegend() {
  const { pressureThreshold, setPressureThreshold, filterDataQuality, setFilterDataQuality } = useWaterStore();

  const gradientStops = [
    { color: '#FF6B6B', label: '<0 异常' },
    { color: '#FFAA00', label: `<${pressureThreshold.toFixed(2)} 低压` },
    { color: '#00D4FF', label: `${pressureThreshold.toFixed(2)}-0.30` },
    { color: '#00FF88', label: '0.30-0.45' },
    { color: '#FFDD00', label: '0.45-0.60' },
    { color: '#FF3333', label: '>0.60 高压' },
  ];

  return (
    <div className="p-4 border border-slate-700/50 rounded-lg bg-slate-900/50">
      <div className="flex items-center gap-2 mb-3">
        <Palette size={16} className="text-cyan-400" />
        <span className="text-sm text-slate-300">压力图例</span>
      </div>

      <div className="mb-4">
        <div className="text-xs text-slate-400 mb-2">压力阈值 (低压告警线)</div>
        <input
          type="range"
          min="0.10"
          max="0.30"
          step="0.01"
          value={pressureThreshold}
          onChange={(e) => setPressureThreshold(parseFloat(e.target.value))}
          className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-500"
        />
        <div className="text-xs text-cyan-400 font-mono mt-1">{pressureThreshold.toFixed(2)} MPa</div>
      </div>

      <div className="space-y-1 mb-4">
        {gradientStops.map((stop, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div
              className="w-8 h-3 rounded"
              style={{ backgroundColor: stop.color, boxShadow: `0 0 8px ${stop.color}40` }}
            />
            <span className="text-slate-400">{stop.label} MPa</span>
          </div>
        ))}
      </div>

      <div className="border-t border-slate-700/50 pt-3">
        <div className="text-xs text-slate-400 mb-2">数据质量过滤</div>
        <div className="flex flex-wrap gap-1">
          {(['good', 'boundary', 'bad'] as const).map(quality => (
            <button
              key={quality}
              onClick={() => {
                const current = filterDataQuality;
                if (current.includes(quality)) {
                  setFilterDataQuality(current.filter(q => q !== quality));
                } else {
                  setFilterDataQuality([...current, quality]);
                }
              }}
              className={`text-xs px-2 py-1 rounded border transition-colors ${
                filterDataQuality.includes(quality)
                  ? quality === 'good'
                    ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                    : quality === 'boundary'
                      ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                      : 'border-red-500/50 bg-red-500/10 text-red-400'
                  : 'border-slate-700 text-slate-500'
              }`}
            >
              {quality === 'good' ? '正常' : quality === 'boundary' ? '边界' : '异常'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
