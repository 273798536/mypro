import { useGameStore } from '@/store/gameStore'
import { Anchor } from 'lucide-react'

const SVG_W = 500
const SVG_H = 350
const BERTH_W = 90
const BERTH_H = 50
const BERTH_GAP = 16
const BERTH_X = 20
const BERTH_START_Y = 30

const ANCHOR_X = 340
const ANCHOR_W = 140

const TUG_CX = 230

function getBerthY(index: number) {
  return BERTH_START_Y + index * (BERTH_H + BERTH_GAP)
}

function getShipColor(status: string) {
  switch (status) {
    case 'arrived': return '#FFFFFF'
    case 'dispatched': return '#00E5FF'
    case 'failed': return '#FF4444'
    case 'completed': return '#888888'
    default: return '#AAAAAA'
  }
}

function getBerthColor(status: string) {
  return status === 'empty' ? '#22C55E' : '#F59E0B'
}

function getTugColor(status: string) {
  return status === 'idle' ? '#60A5FA' : '#F97316'
}

export default function PortMap() {
  const { ships, tugs, berths } = useGameStore()

  const arrivedShips = ships.filter(s => s.status === 'arrived' || s.status === 'dispatched')
  const waitingShips = ships.filter(s => s.status === 'waiting')
  const dispatchingShips = ships.filter(s => s.status === 'dispatched')

  return (
    <div className="rounded-xl border border-slate-700 bg-[#0A1628] p-3 shadow-lg">
      <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-300">
        <Anchor size={16} />
        <span>港口态势图</span>
      </div>
      <svg
        width={SVG_W}
        height={SVG_H}
        viewBox={`0 0 ${SVG_W} ${SVG_H}`}
        className="rounded-lg"
      >
        <defs>
          <pattern id="waves" x="0" y="0" width="60" height="20" patternUnits="userSpaceOnUse">
            <path d="M0 10 Q15 0 30 10 Q45 20 60 10" fill="none" stroke="rgba(56,189,248,0.08)" strokeWidth="1" />
          </pattern>
        </defs>

        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="#0E1F3D" rx="8" />
        <rect x="0" y="0" width={SVG_W} height={SVG_H} fill="url(#waves)" rx="8" />

        <rect x={BERTH_X - 6} y={BERTH_START_Y - 8} width={BERTH_W + 12} height={berths.length * (BERTH_H + BERTH_GAP) + 4} rx="6" fill="rgba(30,58,95,0.6)" stroke="rgba(100,116,139,0.4)" strokeWidth="1" />
        <text x={BERTH_X + BERTH_W / 2} y={BERTH_START_Y - 14} textAnchor="middle" fill="#94A3B8" fontSize="10">泊位区</text>

        {berths.map((berth, i) => {
          const y = getBerthY(i)
          return (
            <g key={berth.id}>
              <rect x={BERTH_X} y={y} width={BERTH_W} height={BERTH_H} rx="4" fill={getBerthColor(berth.status)} fillOpacity="0.3" stroke={getBerthColor(berth.status)} strokeWidth="1.5" />
              <text x={BERTH_X + BERTH_W / 2} y={y + 22} textAnchor="middle" fill="#E2E8F0" fontSize="9">{berth.name}</text>
              <text x={BERTH_X + BERTH_W / 2} y={y + 38} textAnchor="middle" fill={getBerthColor(berth.status)} fontSize="8">{berth.status === 'empty' ? '空闲' : '占用'}</text>
            </g>
          )
        })}

        <rect x={ANCHOR_X - 6} y={BERTH_START_Y - 8} width={ANCHOR_W + 12} height={SVG_H - BERTH_START_Y * 2 + 8} rx="6" fill="rgba(30,58,95,0.4)" stroke="rgba(100,116,139,0.3)" strokeWidth="1" strokeDasharray="4 3" />
        <text x={ANCHOR_X + ANCHOR_W / 2} y={BERTH_START_Y - 14} textAnchor="middle" fill="#94A3B8" fontSize="10">锚地</text>

        {waitingShips.map((ship, i) => {
          const cx = ANCHOR_X + 20 + (i % 4) * 32
          const cy = BERTH_START_Y + 10 + Math.floor(i / 4) * 40
          return (
            <g key={ship.id}>
              <polygon points={`${cx + 8},${cy} ${cx - 6},${cy - 5} ${cx - 6},${cy + 5}`} fill={getShipColor(ship.status)} fillOpacity="0.5" />
              <text x={cx} y={cy + 16} textAnchor="middle" fill="#94A3B8" fontSize="7">{ship.name?.slice(0, 3)}</text>
            </g>
          )
        })}

        {arrivedShips.map((ship, i) => {
          const cx = ANCHOR_X + 20 + (i % 4) * 32
          const cy = BERTH_START_Y + 10 + Math.floor(i / 4) * 40
          return (
            <g key={ship.id}>
              <polygon points={`${cx + 10},${cy} ${cx - 7},${cy - 6} ${cx - 7},${cy + 6}`} fill={getShipColor(ship.status)} />
              <text x={cx} y={cy + 18} textAnchor="middle" fill="#E2E8F0" fontSize="7">{ship.name?.slice(0, 3)}</text>
            </g>
          )
        })}

        {dispatchingShips.map((ship) => {
          const berthIdx = berths.findIndex(b => b.occupiedBy === ship.id)
          if (berthIdx < 0) return null
          const targetY = getBerthY(berthIdx) + BERTH_H / 2
          return (
            <g key={`ds-${ship.id}`}>
              <line x1={BERTH_X + BERTH_W + 4} y1={targetY} x2={ANCHOR_X - 4} y2={targetY} stroke="#00E5FF" strokeWidth="1" strokeDasharray="5 3" opacity="0.6" />
            </g>
          )
        })}

        <text x={TUG_CX} y={BERTH_START_Y - 14} textAnchor="middle" fill="#94A3B8" fontSize="10">拖轮</text>

        {tugs.map((tug, i) => {
          const cy = BERTH_START_Y + 20 + i * 44
          const fuelRatio = tug.maxFuel > 0 ? tug.currentFuel / tug.maxFuel : 1
          return (
            <g key={tug.id}>
              <circle cx={TUG_CX} cy={cy} r="10" fill={getTugColor(tug.status)} fillOpacity="0.8" stroke="#E2E8F0" strokeWidth="1" />
              <text x={TUG_CX} y={cy + 3} textAnchor="middle" fill="#0A1628" fontSize="7" fontWeight="bold">T{i + 1}</text>
              <text x={TUG_CX} y={cy + 22} textAnchor="middle" fill={getTugColor(tug.status)} fontSize="7">{tug.status === 'idle' ? '待命' : '作业'}</text>
              <rect x={TUG_CX - 14} y={cy + 26} width="28" height="3" rx="1" fill="rgba(255,255,255,0.15)" />
              <rect x={TUG_CX - 14} y={cy + 26} width={28 * fuelRatio} height="3" rx="1" fill={fuelRatio > 0.3 ? '#22C55E' : '#EF4444'} />
            </g>
          )
        })}

        <line x1={BERTH_X + BERTH_W + 20} y1={SVG_H - 20} x2={ANCHOR_X - 20} y2={SVG_H - 20} stroke="rgba(56,189,248,0.15)" strokeWidth="1" />
        <text x={SVG_W / 2} y={SVG_H - 8} textAnchor="middle" fill="rgba(148,163,184,0.4)" fontSize="8">主航道</text>
      </svg>
    </div>
  )
}
