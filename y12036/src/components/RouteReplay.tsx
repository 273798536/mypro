import { useState, useEffect, useCallback, useRef } from 'react'
import { Play, Pause, SkipBack, SkipForward, Anchor, AlertTriangle } from 'lucide-react'
import { useGameStore } from '@/store/gameStore'

const SHIP_COLORS: Record<string, string> = {
  'ship-1': '#00D4AA',
  'ship-2': '#FF8C00',
  'ship-3': '#E53E3E',
  'ship-4': '#D69E2E',
}

export default function RouteReplay() {
  const ports = useGameStore(s => s.ports)
  const ships = useGameStore(s => s.ships)
  const routeSegments = useGameStore(s => s.routeSegments)
  const dispatchHistory = useGameStore(s => s.dispatchHistory)
  const session = useGameStore(s => s.session)
  const getDeductionsForRound = useGameStore(s => s.getDeductionsForRound)

  const [currentRound, setCurrentRound] = useState(1)
  const [isPlaying, setIsPlaying] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const totalRounds = session.totalRounds

  const segmentsForRound = routeSegments.filter(s => s.round <= currentRound)
  const actionsForRound = dispatchHistory.filter(a => a.round === currentRound)
  const deductionsForRound = getDeductionsForRound(currentRound)
  const hasKeyDecision = actionsForRound.some(a => !a.tideWindowMatched || a.conflicts.length > 0)

  const handleNext = useCallback(() => {
    setCurrentRound(r => Math.min(r + 1, totalRounds))
  }, [totalRounds])

  const handlePrev = useCallback(() => {
    setCurrentRound(r => Math.max(r - 1, 1))
  }, [])

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentRound(r => {
          if (r >= totalRounds) {
            setIsPlaying(false)
            return r
          }
          const nextR = r + 1
          const nextActions = dispatchHistory.filter(a => a.round === nextR)
          const nextDeductions = getDeductionsForRound(nextR)
          if (nextActions.some(a => !a.tideWindowMatched) || nextDeductions.length > 0) {
            setIsPlaying(false)
            return nextR
          }
          return nextR
        })
      }, 1500)
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [isPlaying, totalRounds, dispatchHistory, getDeductionsForRound])

  return (
    <div className="rounded-xl border border-[#1a2a4a] bg-[#0A1628] p-4">
      <div className="relative">
        <svg viewBox="0 0 900 500" className="w-full h-auto">
          <defs>
            <pattern id="ocean-grid" width="50" height="50" patternUnits="userSpaceOnUse">
              <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#1a2a4a" strokeWidth="0.5" />
            </pattern>
            <style>{`
              @keyframes dash-flow {
                to { stroke-dashoffset: -20; }
              }
              .route-line-active {
                animation: dash-flow 1s linear infinite;
              }
            `}</style>
          </defs>
          <rect width="900" height="500" fill="#0A1628" />
          <rect width="900" height="500" fill="url(#ocean-grid)" />

          {segmentsForRound.map((seg, i) => {
            const fromPort = ports.find(p => p.id === seg.fromPortId)
            const toPort = ports.find(p => p.id === seg.toPortId)
            if (!fromPort || !toPort) return null
            const isActive = seg.round === currentRound
            const color = SHIP_COLORS[seg.shipId] || '#00D4AA'
            return (
              <g key={`${seg.shipId}-${seg.round}-${i}`}>
                <line
                  x1={fromPort.position.x}
                  y1={fromPort.position.y}
                  x2={toPort.position.x}
                  y2={toPort.position.y}
                  stroke={color}
                  strokeWidth={isActive ? 3 : 1.5}
                  strokeDasharray={isActive ? '10 5' : '4 4'}
                  strokeOpacity={isActive ? 1 : 0.35}
                  className={isActive ? 'route-line-active' : ''}
                />
                {isActive && (
                  <circle
                    cx={toPort.position.x}
                    cy={toPort.position.y}
                    r="8"
                    fill={color}
                    opacity={0.4}
                  >
                    <animate attributeName="r" values="8;14;8" dur="1.5s" repeatCount="indefinite" />
                    <animate attributeName="opacity" values="0.4;0.1;0.4" dur="1.5s" repeatCount="indefinite" />
                  </circle>
                )}
              </g>
            )
          })}

          {ports.map(port => {
            const hasAction = actionsForRound.some(a => a.toPortId === port.id || a.fromPortId === port.id)
            const hasDeduction = deductionsForRound.some(d => {
              const action = dispatchHistory.find(a => a.id === d.actionId)
              return action?.toPortId === port.id || action?.fromPortId === port.id
            })
            return (
              <g key={port.id}>
                <circle
                  cx={port.position.x}
                  cy={port.position.y}
                  r={hasAction ? 16 : 12}
                  fill={hasDeduction ? '#E53E3E' : hasAction ? '#00D4AA' : '#1a2a4a'}
                  stroke={hasAction ? '#00D4AA' : '#2a3a5a'}
                  strokeWidth={hasAction ? 2 : 1}
                />
                <text
                  x={port.position.x}
                  y={port.position.y - 24}
                  textAnchor="middle"
                  fill="#94a3b8"
                  fontSize="11"
                >
                  {port.name}
                </text>
                {hasDeduction && (
                  <g transform={`translate(${port.position.x + 14}, ${port.position.y - 14})`}>
                    <circle r="6" fill="#E53E3E" />
                    <text textAnchor="middle" dy="3.5" fill="white" fontSize="9" fontWeight="bold">!</text>
                  </g>
                )}
              </g>
            )
          })}

          {actionsForRound.map(action => {
            const toPort = ports.find(p => p.id === action.toPortId)
            const ship = ships.find(s => s.id === action.shipId)
            if (!toPort || !ship) return null
            const color = SHIP_COLORS[action.shipId] || '#00D4AA'
            const offsetX = (actionsForRound.indexOf(action) - (actionsForRound.length - 1) / 2) * 20
            return (
              <g key={action.id}>
                <polygon
                  points={`${toPort.position.x + offsetX},${toPort.position.y - 26} ${toPort.position.x + offsetX - 5},${toPort.position.y - 18} ${toPort.position.x + offsetX + 5},${toPort.position.y - 18}`}
                  fill={color}
                />
                <text
                  x={toPort.position.x + offsetX}
                  y={toPort.position.y - 32}
                  textAnchor="middle"
                  fill={color}
                  fontSize="9"
                  fontWeight="bold"
                >
                  {ship.name}
                </text>
              </g>
            )
          })}
        </svg>

        {hasKeyDecision && (
          <div className="absolute top-3 right-3 flex items-center gap-1.5 rounded-lg bg-[#E53E3E]/20 px-3 py-1.5 text-xs font-medium text-[#E53E3E]">
            <AlertTriangle size={14} />
            关键决策点
          </div>
        )}
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrev}
            disabled={currentRound <= 1}
            className="flex items-center gap-1 rounded-lg bg-[#1a2a4a] px-3 py-2 text-sm text-[#94a3b8] hover:bg-[#2a3a5a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            <SkipBack size={16} />
            上一回合
          </button>
          <button
            onClick={() => setIsPlaying(p => !p)}
            className="flex items-center gap-1.5 rounded-lg bg-[#00D4AA]/20 px-5 py-2 text-sm font-medium text-[#00D4AA] hover:bg-[#00D4AA]/30 transition-colors"
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
            {isPlaying ? '暂停' : '播放'}
          </button>
          <button
            onClick={handleNext}
            disabled={currentRound >= totalRounds}
            className="flex items-center gap-1 rounded-lg bg-[#1a2a4a] px-3 py-2 text-sm text-[#94a3b8] hover:bg-[#2a3a5a] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            下一回合
            <SkipForward size={16} />
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 text-sm text-[#94a3b8]">
            <Anchor size={14} className="text-[#00D4AA]" />
            回合 {currentRound} / {totalRounds}
          </div>
          <div className="flex gap-1">
            {Array.from({ length: totalRounds }, (_, i) => i + 1).map(r => (
              <button
                key={r}
                onClick={() => { setCurrentRound(r); setIsPlaying(false) }}
                className={`h-2 rounded-full transition-all ${
                  r === currentRound
                    ? 'w-8 bg-[#00D4AA]'
                    : getDeductionsForRound(r).length > 0
                      ? 'w-5 bg-[#E53E3E]/60'
                      : 'w-5 bg-[#1a2a4a] hover:bg-[#2a3a5a]'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-5">
        {ships.map(ship => (
          <div key={ship.id} className="flex items-center gap-1.5 text-xs text-[#94a3b8]">
            <span
              className="inline-block h-2 w-4 rounded-sm"
              style={{ backgroundColor: SHIP_COLORS[ship.id] || '#00D4AA' }}
            />
            {ship.name}
          </div>
        ))}
      </div>
    </div>
  )
}
