import { useCalcStore } from '@/store/useCalcStore';

export default function MapLegend() {
  const devices = useCalcStore(s => s.devices);
  const zones = useCalcStore(s => s.noGoZones);
  const summary = {
    available: devices.filter(d => d.status === 'AVAILABLE').length,
    deferred: devices.filter(d => d.status === 'DEFERRED').length,
    recollect: devices.filter(d => d.status === 'RECOLLECT').length,
  };
  return (
    <div className="absolute top-3 right-3 z-[400] bg-white/95 backdrop-blur rounded-lg shadow-card
                    border border-slate-200 p-3 w-48 animate-fade-in">
      <div className="text-xs font-semibold text-ocean-900 mb-2 pb-1.5 border-b border-slate-100">
        图例 · 状态色说明
      </div>
      <div className="space-y-1.5 text-[11px]">
        <LegendItem color="#0E7C7B" label="可用（直接采用）" count={summary.available} />
        <LegendItem color="#E9A23B" label="暂缓（需复核）" count={summary.deferred} />
        <LegendItem color="#D64045" label="需重采 / 越界" count={summary.recollect} />
        <div className="pt-1.5 mt-1.5 border-t border-slate-100">
          <LegendItem color="#D64045" label="航道/保护区" count={zones.length} dashed />
        </div>
      </div>
    </div>
  );
}

function LegendItem({ color, label, count, dashed }: { color: string; label: string; count: number; dashed?: boolean }) {
  return (
    <div className="flex items-center gap-2 text-ocean-700">
      {dashed ? (
        <span className="w-4 h-0.5" style={{ background: `repeating-linear-gradient(90deg, ${color} 0 4px, transparent 4px 8px)` }} />
      ) : (
        <span className="w-3 h-3 rounded-full" style={{ background: color, boxShadow: `0 0 0 2px white, 0 0 0 3px ${color}30` }} />
      )}
      <span className="flex-1 truncate">{label}</span>
      <span className="font-mono tabular-nums text-ocean-900 font-medium">{count}</span>
    </div>
  );
}
