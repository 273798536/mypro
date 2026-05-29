import { Clock, Navigation, MapPin, Zap, Wind } from 'lucide-react'
import type { Point } from '@/types/game'

interface FlightStatusBarProps {
  position: Point
  heading: number
  battery: number
  speed: number
  currentWaypoint: number
  totalWaypoints: number
  elapsed: number
  windAtPosition: { direction: number; speed: number }
  isHeadwind: boolean
}

export default function FlightStatusBar({
  position,
  heading,
  battery,
  speed,
  currentWaypoint,
  totalWaypoints,
  elapsed,
  windAtPosition,
  isHeadwind,
}: FlightStatusBarProps) {
  const minutes = Math.floor(elapsed / 60)
  const seconds = elapsed % 60

  const batteryColor =
    battery > 50 ? 'text-emerald-400' : battery > 25 ? 'text-yellow-400' : 'text-red-400'

  const windBadge = isHeadwind
    ? 'bg-orange-500/15 border-orange-500/30 text-orange-400'
    : 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400'

  return (
    <div className="flex items-center justify-between gap-4 px-4 py-2 bg-slate-900/90 border-b border-slate-700/50 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <Clock size={14} className="text-slate-500" />
          <span className="text-xs tabular-nums text-slate-300">
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Navigation size={14} className="text-[#06d6a0]" style={{ transform: `rotate(${heading}deg)` }} />
          <span className="text-xs tabular-nums text-slate-300">{Math.round(heading)}°</span>
        </div>

        <div className="flex items-center gap-1.5">
          <MapPin size={14} className="text-slate-500" />
          <span className="text-xs tabular-nums text-slate-400">
            ({position.x.toFixed(1)}, {position.y.toFixed(1)})
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-xs text-slate-500">目标</span>
        <span className="text-xs font-medium text-[#06d6a0]">
          WP{currentWaypoint}
          <span className="text-slate-500">/{totalWaypoints}</span>
        </span>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-slate-500">速度</span>
          <span className="text-xs tabular-nums text-slate-300">{speed.toFixed(1)}</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Zap size={14} className={batteryColor} />
          <span className={`text-xs tabular-nums font-medium ${batteryColor}`}>
            {Math.round(battery)}%
          </span>
        </div>

        <div className={`flex items-center gap-1 px-2 py-0.5 rounded border ${windBadge}`}>
          <Wind size={12} />
          <span className="text-[10px] tabular-nums font-medium">
            {windAtPosition.speed.toFixed(1)}m/s
          </span>
          <span className="text-[10px]">
            {isHeadwind ? '逆风' : '顺风'}
          </span>
        </div>
      </div>
    </div>
  )
}
