import { AlertTriangle, BatteryWarning } from 'lucide-react'
import type { FlightEvent } from '@/types/game'

interface EventPopupProps {
  event: FlightEvent | null
  onDismiss: () => void
}

export default function EventPopup({ event, onDismiss }: EventPopupProps) {
  if (!event) return null

  const isNoFly = event.type === 'no_fly_zone_enter'
  const isLowBattery = event.type === 'low_battery' || event.type === 'return_battery_critical'

  const borderColor = isNoFly
    ? 'border-red-500'
    : isLowBattery
      ? 'border-orange-400'
      : 'border-slate-500'

  const glowShadow = isNoFly
    ? 'shadow-[0_0_30px_rgba(239,68,68,0.3)]'
    : isLowBattery
      ? 'shadow-[0_0_30px_rgba(251,191,36,0.3)]'
      : 'shadow-[0_0_30px_rgba(100,116,139,0.2)]'

  const iconEl = isNoFly ? (
    <AlertTriangle size={28} className="text-red-400" />
  ) : isLowBattery ? (
    <BatteryWarning size={28} className="text-orange-400" />
  ) : (
    <AlertTriangle size={28} className="text-slate-400" />
  )

  const title = isNoFly
    ? '禁飞区警告'
    : isLowBattery
      ? '电量警告'
      : '事件通知'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`w-[380px] rounded-xl bg-slate-900 border-2 ${borderColor} ${glowShadow} p-6 flex flex-col items-center gap-4`}
      >
        <div className="flex items-center gap-3">
          {iconEl}
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
        </div>

        <p className="text-sm text-slate-300 leading-relaxed text-center">
          {event.message}
        </p>

        {isNoFly && event.details.zone && (
          <p className="text-xs text-red-400/80">
            ⚠ 禁飞区穿越！区域：{String(event.details.zone)}。立即返航或接受扣分。
          </p>
        )}

        {isLowBattery && event.details.battery != null && event.details.extraDrain != null && (
          <p className="text-xs text-orange-400/80">
            🔋 返航电量不足！逆风已多消耗{String(event.details.extraDrain)}%电量，当前电量仅{String(event.details.battery)}%
          </p>
        )}

        <button
          onClick={onDismiss}
          className={`mt-2 px-8 py-2 rounded-lg font-medium text-sm transition-all
            ${isNoFly
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30 hover:shadow-[0_0_12px_rgba(239,68,68,0.3)]'
              : isLowBattery
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 hover:bg-orange-500/30 hover:shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                : 'bg-slate-700/50 text-slate-300 border border-slate-600 hover:bg-slate-700'
            }`}
        >
          确认
        </button>
      </div>
    </div>
  )
}
