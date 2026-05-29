import { useEffect } from 'react'
import { useGameStore } from '@/store/gameStore'
import { minutesToTime } from '@/types'

const START = 360
const END = 1440
const RANGE = END - START

const TIME_MARKERS = [360, 480, 600, 720, 840, 960, 1080, 1200, 1320, 1440]

const STATUS_COLORS: Record<string, string> = {
  waiting: '#6B7280',
  arrived: '#38BDF8',
  dispatched: '#34D399',
  completed: '#10B981',
  failed: '#EF4444',
}

function toX(minutes: number, w: number) {
  return ((minutes - START) / RANGE) * w
}

function tideLevel(m: number) {
  return Math.cos((2 * Math.PI * (m - 540)) / 360)
}

export default function Timeline() {
  const { currentTime, autoPlay, phase, ships, advanceTime, toggleAutoPlay, resetGame } = useGameStore()

  useEffect(() => {
    if (!autoPlay || phase !== 'playing') return
    const id = setInterval(advanceTime, 2000)
    return () => clearInterval(id)
  }, [autoPlay, phase, advanceTime])

  const W = 900
  const barY = 55
  const barH = 24

  const tidePath = (() => {
    const pts: string[] = []
    for (let m = START; m <= END; m += 4) {
      const x = toX(m, W)
      const y = barY + barH - ((tideLevel(m) + 1) / 2) * barH
      pts.push(`${m === START ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`)
    }
    return pts.join(' ')
  })()

  const curX = toX(currentTime, W)

  return (
    <div className="bg-[#0A1628] rounded-xl p-4">
      <svg viewBox={`0 0 ${W} 100`} className="w-full h-auto">
        <defs>
          <linearGradient id="tideGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#1E3A5F" stopOpacity="0.15" />
          </linearGradient>
        </defs>

        <rect x={0} y={barY} width={W} height={barH} rx={4} fill="#1E293B" />

        <path
          d={`${tidePath} L${W},${barY + barH} L0,${barY + barH} Z`}
          fill="url(#tideGrad)"
        />
        <path d={tidePath} fill="none" stroke="#3B82F6" strokeWidth="1.5" opacity="0.8" />

        {TIME_MARKERS.map(m => {
          const x = toX(m, W)
          return (
            <g key={m}>
              <line x1={x} y1={barY + barH} x2={x} y2={barY + barH + 6} stroke="#94A3B8" strokeWidth="1" />
              <text x={x} y={barY + barH + 18} textAnchor="middle" fill="#94A3B8" fontSize="10">
                {minutesToTime(m)}
              </text>
            </g>
          )
        })}

        {ships.map(ship => {
          const x = toX(ship.arrivalTime, W)
          const color = STATUS_COLORS[ship.status] ?? '#6B7280'
          return (
            <polygon
              key={ship.id}
              points={`${x},${barY - 2} ${x - 5},${barY - 12} ${x + 5},${barY - 12}`}
              fill={color}
            />
          )
        })}

        <line x1={curX} y1={barY - 16} x2={curX} y2={barY + barH + 4} stroke="#F59E0B" strokeWidth="2" />
        <text x={curX} y={barY - 20} textAnchor="middle" fill="#F59E0B" fontSize="11" fontWeight="bold">
          {minutesToTime(currentTime)}
        </text>
      </svg>

      <div className="flex items-center justify-center gap-3 mt-3">
        <button
          onClick={advanceTime}
          disabled={phase !== 'playing'}
          className="px-4 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded-lg transition-colors"
        >
          推进30分钟
        </button>
        <button
          onClick={toggleAutoPlay}
          disabled={phase !== 'playing'}
          className={`px-4 py-1.5 text-sm rounded-lg transition-colors ${
            autoPlay
              ? 'bg-red-600 hover:bg-red-500 text-white'
              : 'bg-blue-600 hover:bg-blue-500 text-white disabled:bg-gray-700 disabled:text-gray-500'
          }`}
        >
          {autoPlay ? '暂停' : '自动播放'}
        </button>
        <button
          onClick={resetGame}
          className="px-4 py-1.5 bg-gray-600 hover:bg-gray-500 text-white text-sm rounded-lg transition-colors"
        >
          重置
        </button>
      </div>
    </div>
  )
}
