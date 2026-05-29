import { Wind } from 'lucide-react'

interface WindInfoProps {
  windDirection: number
  windSpeed: number
  isHeadwind: boolean
}

export default function WindInfo({ windDirection, windSpeed, isHeadwind }: WindInfoProps) {
  const speedColor =
    windSpeed < 3 ? 'text-blue-400' : windSpeed < 6 ? 'text-yellow-400' : 'text-orange-400'

  const statusLabel = isHeadwind ? '逆风' : '顺风'
  const statusColor = isHeadwind ? 'text-orange-400' : 'text-emerald-400'
  const statusBg = isHeadwind ? 'bg-orange-500/15 border-orange-500/30' : 'bg-emerald-500/15 border-emerald-500/30'

  const arrowRotation = windDirection

  return (
    <div className="flex flex-col items-center gap-2 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50 min-w-[100px]">
      <div className="flex items-center gap-1 text-slate-400 text-xs font-medium">
        <Wind size={14} />
        <span>风力</span>
      </div>

      <div className="relative w-16 h-16 rounded-full border border-slate-600 bg-slate-900/80">
        <svg viewBox="0 0 64 64" className="w-full h-full">
          <text x="32" y="10" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="sans-serif">N</text>
          <text x="32" y="60" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="sans-serif">S</text>
          <text x="6" y="35" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="sans-serif">W</text>
          <text x="58" y="35" textAnchor="middle" fill="#64748b" fontSize="7" fontFamily="sans-serif">E</text>
          <g transform={`rotate(${arrowRotation}, 32, 32)`}>
            <line x1="32" y1="44" x2="32" y2="18" stroke="#06d6a0" strokeWidth="2" strokeLinecap="round" />
            <polygon points="32,14 28,22 36,22" fill="#06d6a0" />
          </g>
          <circle cx="32" cy="32" r="3" fill="#0f172a" stroke="#06d6a0" strokeWidth="1" />
        </svg>
      </div>

      <div className="flex flex-col items-center gap-0.5">
        <span className={`text-lg font-bold tabular-nums ${speedColor}`}>
          {windSpeed.toFixed(1)}
          <span className="text-xs ml-0.5 font-normal text-slate-400">m/s</span>
        </span>
        <span className="text-[10px] text-slate-500">
          方向 {Math.round(windDirection)}°
        </span>
      </div>

      <div className={`px-2 py-0.5 rounded border text-xs font-medium ${statusBg} ${statusColor}`}>
        {statusLabel}
      </div>
    </div>
  )
}
