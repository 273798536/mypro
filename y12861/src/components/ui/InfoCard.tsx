import { Fish, Droplets, AlertTriangle, Navigation } from 'lucide-react';
import { fishingRecords, fishingSpots, waterQualityList, buoys, dataGaps } from '@/data/mockData';

export function InfoCard() {
  const totalCatch = fishingRecords.reduce((sum, r) => sum + r.weight, 0);
  const warningCount = waterQualityList.filter((wq) => wq.isWarning).length;
  const offlineBuoys = buoys.filter((b) => b.status === 'offline').length;
  const gapCount = dataGaps.length;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex gap-3">
      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 px-4 py-2 flex items-center gap-3 shadow-xl">
        <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
          <Fish size={16} className="text-cyan-400" />
        </div>
        <div>
          <div className="text-lg font-bold text-white">{fishingRecords.length}</div>
          <div className="text-xs text-slate-400">渔获记录 · {totalCatch.toFixed(1)}kg</div>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 px-4 py-2 flex items-center gap-3 shadow-xl">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
          <Navigation size={16} className="text-emerald-400" />
        </div>
        <div>
          <div className="text-lg font-bold text-white">{fishingSpots.length}</div>
          <div className="text-xs text-slate-400">渔点分布</div>
        </div>
      </div>

      <div className="bg-slate-900/80 backdrop-blur-md rounded-xl border border-slate-700/50 px-4 py-2 flex items-center gap-3 shadow-xl">
        <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
          <Droplets size={16} className="text-orange-400" />
        </div>
        <div>
          <div className="text-lg font-bold text-white">
            {waterQualityList.length - warningCount}/{waterQualityList.length}
          </div>
          <div className="text-xs text-slate-400">水质达标</div>
        </div>
      </div>

      {gapCount > 0 && (
        <div className="bg-red-500/10 backdrop-blur-md rounded-xl border border-red-500/30 px-4 py-2 flex items-center gap-3 shadow-xl">
          <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
            <AlertTriangle size={16} className="text-red-400" />
          </div>
          <div>
            <div className="text-lg font-bold text-red-400">{gapCount}</div>
            <div className="text-xs text-red-400/80">材料缺口</div>
          </div>
        </div>
      )}
    </div>
  );
}
