import { useAppStore } from '../store/useAppStore';
import { AlertTriangle, ChevronDown, ChevronUp, Thermometer, Battery, XCircle } from 'lucide-react';

export function GapSection() {
  const { samples, gapSectionVisible, actions: { toggleGapSection } } = useAppStore();
  const gapSamples = samples.filter(s => s.type === 'gap');

  if (gapSamples.length === 0) return null;

  return (
    <div className="rounded-xl overflow-hidden border border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-amber-500/5">
      <button
        onClick={toggleGapSection}
        className="w-full px-4 py-3 flex items-center justify-between bg-yellow-500/10 hover:bg-yellow-500/15 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-400" />
          <span className="font-semibold text-yellow-300">采样缺口专区</span>
          <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
            {gapSamples.length} 条
          </span>
        </div>
        {gapSectionVisible ? (
          <ChevronUp className="w-5 h-5 text-yellow-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-yellow-400" />
        )}
      </button>

      {gapSectionVisible && (
        <div className="p-4 space-y-3">
          <p className="text-xs text-yellow-400/70 border-l-2 border-yellow-500/50 pl-3">
            以下样本存在采样缺口，已从正常结果中单独拎出。
            <br />排班同事请注意：这些数据不参与误差归因的正常统计。
          </p>

          {gapSamples.map((sample) => (
            <div
              key={sample.id}
              className="flex gap-3 p-3 rounded-lg bg-slate-900/50 border border-yellow-500/20"
              style={{
                backgroundImage: `repeating-linear-gradient(
                  45deg,
                  transparent,
                  transparent 10px,
                  rgba(234, 179, 8, 0.03) 10px,
                  rgba(234, 179, 8, 0.03) 20px
                )`
              }}
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 bg-slate-800">
                <img
                  src={sample.photoUrl}
                  alt={sample.name}
                  className="w-full h-full object-cover opacity-70"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm text-slate-200">{sample.name}</span>
                  <XCircle className="w-4 h-4 text-yellow-500" />
                </div>

                <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                  <span className="flex items-center gap-1">
                    <Thermometer className="w-3 h-3" />
                    {sample.temperature}°C
                  </span>
                  <span className="flex items-center gap-1">
                    <Battery className="w-3 h-3" />
                    {sample.soc}%
                  </span>
                </div>

                {sample.gapReason && (
                  <p className="text-xs text-yellow-400/80 mt-2">
                    缺口原因：{sample.gapReason}
                  </p>
                )}

                {sample.notes && (
                  <p className="text-[11px] text-slate-500 mt-1">{sample.notes}</p>
                )}
              </div>

              <div className="text-right flex-shrink-0">
                <div className="text-lg font-mono font-bold text-yellow-400">
                  {sample.internalResistance.toFixed(2)}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">mΩ</div>
              </div>
            </div>
          ))}

          <div className="pt-2 border-t border-yellow-500/10">
            <div className="flex items-center justify-between text-xs">
              <span className="text-yellow-400/70">对结论影响程度</span>
              <span className="text-yellow-300 font-medium">需单独评估</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-800 overflow-hidden">
              <div className="h-full w-3/5 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
