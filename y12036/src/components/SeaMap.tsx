import { useMemo } from 'react'
import { useGameStore } from '@/store/gameStore'
import { Waves } from 'lucide-react'

const ROUTES: [string, string][] = [
  ['port-a', 'port-b'],
  ['port-a', 'port-d'],
  ['port-b', 'port-c'],
  ['port-c', 'port-e'],
  ['port-c', 'port-f'],
  ['port-d', 'port-e'],
  ['port-e', 'port-f'],
  ['port-a', 'port-c'],
  ['port-b', 'port-d'],
  ['port-d', 'port-f'],
]

interface SeaMapProps {
  selectedShipId: string | null
  onPortClick: (portId: string) => void
}

export default function SeaMap({ selectedShipId, onPortClick }: SeaMapProps) {
  const ports = useGameStore(s => s.ports)
  const ships = useGameStore(s => s.ships)
  const session = useGameStore(s => s.session)
  const getTideEntry = useGameStore(s => s.getTideEntry)
  const isPortDockable = useGameStore(s => s.isPortDockable)
  const hasTideMissing = useGameStore(s => s.hasTideMissing)

  const portMap = useMemo(() => {
    const m = new Map<string, typeof ports[0]>()
    ports.forEach(p => m.set(p.id, p))
    return m
  }, [ports])

  const tideColors = useMemo(() => {
    const colors = new Map<string, string>()
    ports.forEach(p => {
      const entry = getTideEntry(p.id, session.currentRound)
      const missing = hasTideMissing(p.id, session.currentRound)
      if (missing) {
        colors.set(p.id, 'missing')
      } else if (!entry) {
        colors.set(p.id, 'unknown')
      } else if (entry.dangerous) {
        colors.set(p.id, 'danger')
      } else if (entry.dockable) {
        colors.set(p.id, 'dockable')
      } else {
        colors.set(p.id, 'blocked')
      }
    })
    return colors
  }, [ports, session.currentRound, getTideEntry, hasTideMissing])

  const getPortColor = (portId: string) => {
    const status = tideColors.get(portId)
    switch (status) {
      case 'dockable': return '#00D4AA'
      case 'blocked': return '#E53E3E'
      case 'danger': return '#FF8C00'
      case 'missing': return '#E53E3E'
      default: return '#4A5568'
    }
  }

  return (
    <div className="relative w-full h-full bg-ocean-dark rounded-lg border border-ocean-light/30 overflow-hidden">
      <svg
        viewBox="0 0 900 500"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="waves" x="0" y="0" width="60" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M0 10 Q15 0 30 10 Q45 20 60 10"
              fill="none"
              stroke="#1A3A6B"
              strokeWidth="0.5"
              opacity="0.4"
            />
          </pattern>
          <filter id="glow-green">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#00D4AA" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-red">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feFlood floodColor="#E53E3E" floodOpacity="0.5" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glow-amber">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feFlood floodColor="#FF8C00" floodOpacity="0.6" />
            <feComposite in2="blur" operator="in" />
            <feMerge><feMergeNode /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width="900" height="500" fill="#0D1F3C" />
        <rect width="900" height="500" fill="url(#waves)" />

        {ROUTES.map(([fromId, toId]) => {
          const from = portMap.get(fromId)
          const to = portMap.get(toId)
          if (!from || !to) return null
          return (
            <line
              key={`${fromId}-${toId}`}
              x1={from.position.x}
              y1={from.position.y}
              x2={to.position.x}
              y2={to.position.y}
              stroke="#1A3A6B"
              strokeWidth="1.5"
              strokeDasharray="8 4"
              opacity="0.5"
            />
          )
        })}

        {ports.map(port => {
          const color = getPortColor(port.id)
          const tideStatus = tideColors.get(port.id)
          const filterId = tideStatus === 'dockable'
            ? 'url(#glow-green)'
            : tideStatus === 'blocked'
            ? 'url(#glow-red)'
            : tideStatus === 'danger'
            ? 'url(#glow-amber)'
            : undefined
          const isDangerOrMissing = tideStatus === 'danger' || tideStatus === 'missing'
          const dockable = isPortDockable(port.id, session.currentRound)

          return (
            <g
              key={port.id}
              className="cursor-pointer"
              onClick={() => onPortClick(port.id)}
              filter={filterId}
            >
              <circle
                cx={port.position.x}
                cy={port.position.y}
                r="24"
                fill="#0A1628"
                stroke={color}
                strokeWidth="2.5"
                opacity={isDangerOrMissing ? undefined : 1}
              >
                {isDangerOrMissing && (
                  <animate
                    attributeName="opacity"
                    values="1;0.3;1"
                    dur={tideStatus === 'missing' ? '0.8s' : '1.2s'}
                    repeatCount="indefinite"
                  />
                )}
              </circle>

              <circle
                cx={port.position.x}
                cy={port.position.y}
                r="14"
                fill={color}
                opacity="0.2"
              />

              <text
                x={port.position.x}
                y={port.position.y + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={color}
                fontSize="11"
                fontFamily="'Noto Serif SC', serif"
                fontWeight="700"
              >
                {port.name.slice(0, 2)}
              </text>

              <text
                x={port.position.x}
                y={port.position.y + 38}
                textAnchor="middle"
                fill="#94A3B8"
                fontSize="10"
                fontFamily="'Noto Sans SC', sans-serif"
              >
                {port.name}
              </text>

              {dockable && (
                <circle
                  cx={port.position.x + 20}
                  cy={port.position.y - 20}
                  r="4"
                  fill="#00D4AA"
                >
                  <animate attributeName="r" values="3;5;3" dur="2s" repeatCount="indefinite" />
                </circle>
              )}
            </g>
          )
        })}

        {ships.map(ship => {
          const isSailing = ship.status === 'sailing'
          const isSelected = ship.id === selectedShipId
          const fillColor = isSelected
            ? '#00D4AA'
            : ship.status === 'locked'
            ? '#D69E2E'
            : '#E2E8F0'

          return (
            <g key={ship.id} transform={`translate(${ship.position.x}, ${ship.position.y - 32})`}>
              <polygon
                points="0,-10 6,4 0,0 -6,4"
                fill={fillColor}
                stroke={isSelected ? '#00D4AA' : '#94A3B8'}
                strokeWidth="1"
              >
                {isSailing && (
                  <animateTransform
                    attributeName="transform"
                    type="rotate"
                    values="0;5;-5;0"
                    dur="2s"
                    repeatCount="indefinite"
                  />
                )}
              </polygon>
              {isSelected && (
                <circle cx="0" cy="-2" r="14" fill="none" stroke="#00D4AA" strokeWidth="1.5">
                  <animate attributeName="r" values="12;16;12" dur="1.5s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite" />
                </circle>
              )}
              <text
                x="0"
                y="-16"
                textAnchor="middle"
                fill={fillColor}
                fontSize="9"
                fontFamily="'Noto Sans SC', sans-serif"
                fontWeight="500"
              >
                {ship.name}
              </text>
            </g>
          )
        })}

        <g transform="translate(16, 16)">
          <rect width="140" height="72" rx="6" fill="#0A1628" fillOpacity="0.85" stroke="#1A3A6B" strokeWidth="1" />
          <circle cx="16" cy="16" r="5" fill="#00D4AA" />
          <text x="28" y="20" fill="#94A3B8" fontSize="10" fontFamily="'Noto Sans SC', sans-serif">可停靠</text>
          <circle cx="80" cy="16" r="5" fill="#E53E3E" />
          <text x="92" y="20" fill="#94A3B8" fontSize="10" fontFamily="'Noto Sans SC', sans-serif">禁入</text>
          <circle cx="16" cy="36" r="5" fill="#FF8C00" />
          <text x="28" y="40" fill="#94A3B8" fontSize="10" fontFamily="'Noto Sans SC', sans-serif">危险</text>
          <circle cx="80" cy="36" r="5" fill="#E53E3E" />
          <text x="92" y="40" fill="#94A3B8" fontSize="10" fontFamily="'Noto Sans SC', sans-serif">缺失</text>
          <polygon points="16,52 22,62 16,58 10,62" fill="#E2E8F0" />
          <text x="28" y="60" fill="#94A3B8" fontSize="10" fontFamily="'Noto Sans SC', sans-serif">船舶</text>
        </g>
      </svg>

      <div className="absolute top-3 right-3 flex items-center gap-2 bg-deep-sea/80 px-3 py-1.5 rounded border border-ocean-light/30">
        <Waves size={14} className="text-tide-cyan" />
        <span className="text-xs font-sans-sc text-slate-300">
          第{session.currentRound}回合 潮汐
        </span>
      </div>
    </div>
  )
}
