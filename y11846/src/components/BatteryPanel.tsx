import { Zap } from 'lucide-react'

interface BatteryPanelProps {
  battery: number
  drainRate: number
  isHeadwind: boolean
  headwindCoefficient: number
  minReturnBattery: number
  maxBattery?: number
}

export default function BatteryPanel({
  battery,
  drainRate,
  isHeadwind,
  headwindCoefficient,
  minReturnBattery,
}: BatteryPanelProps) {
  const isLow = battery < minReturnBattery

  const barColor =
    battery > 50 ? 'bg-emerald-400' : battery > 25 ? 'bg-yellow-400' : 'bg-red-500'

  const glowColor =
    battery > 50
      ? 'shadow-[0_0_12px_rgba(52,211,153,0.5)]'
      : battery > 25
        ? 'shadow-[0_0_12px_rgba(250,204,21,0.5)]'
        : 'shadow-[0_0_12px_rgba(239,68,68,0.6)]'

  const textColor =
    battery > 50 ? 'text-emerald-400' : battery > 25 ? 'text-yellow-400' : 'text-red-400'

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 min-w-[72px]">
      <div className="text-xs text-slate-400 font-medium">电量</div>

      <div className="relative w-8 h-28 rounded-md border-2 border-slate-600 overflow-hidden bg-slate-900">
        <div
          className={`absolute bottom-0 left-0 right-0 transition-all duration-500 ${barColor} ${glowColor} ${isLow ? 'animate-pulse' : ''}`}
          style={{ height: `${battery}%` }}
        />
        <div className="absolute top-0 left-0 right-0 h-1 bg-slate-600 rounded-t" />
      </div>

      <div className={`text-lg font-bold tabular-nums ${textColor}`}>
        {Math.round(battery)}%
      </div>

      <div className="text-[10px] text-slate-400 tabular-nums">
        耗电率: {drainRate.toFixed(1)}%/格
      </div>

      {isHeadwind && (
        <div className="flex items-center gap-1 px-2 py-1 rounded bg-orange-500/15 border border-orange-500/30">
          <Zap size={12} className="text-orange-400" />
          <span className="text-[10px] text-orange-400 font-medium">
            逆风系数 ×{headwindCoefficient.toFixed(1)}
          </span>
        </div>
      )}

      {isLow && (
        <div className="text-[10px] text-red-400 animate-pulse font-medium">
          电量不足
        </div>
      )}
    </div>
  )
}
