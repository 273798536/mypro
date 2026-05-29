import type { Point, Waypoint, NoFlyZone, WindField, WindChange } from '@/types/game'

interface MapCanvasProps {
  gridSize: { width: number; height: number }
  waypoints: Waypoint[]
  noFlyZones: NoFlyZone[]
  windField: WindField
  dronePosition: Point | null
  droneHeading: number
  plannedPath: Point[]
  windChanges: WindChange[]
  showWindOverlay: boolean
  home?: Point
  trail?: Point[]
  editable?: boolean
  onWaypointsChange?: (waypoints: Waypoint[]) => void
}

function windSpeedColor(speed: number, maxSpeed: number): string {
  const ratio = Math.min(speed / maxSpeed, 1)
  if (ratio < 0.5) {
    const t = ratio / 0.5
    const r = Math.round(59 + t * (251 - 59))
    const g = Math.round(130 + t * (191 - 130))
    const b = Math.round(246 + t * (36 - 246))
    return `rgb(${r},${g},${b})`
  }
  return `rgb(251,191,36)`
}

export default function MapCanvas({
  gridSize,
  waypoints,
  noFlyZones,
  windField,
  dronePosition,
  droneHeading,
  plannedPath,
  windChanges,
  showWindOverlay,
  home,
  trail = [],
}: MapCanvasProps) {
  const w = gridSize.width
  const h = gridSize.height
  const maxWindSpeed = Math.max(...windField.segments.map(s => s.speed), 1)

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className="w-full h-full"
      style={{ background: '#0f172a' }}
    >
      <defs>
        <pattern id="grid" width="1" height="1" patternUnits="userSpaceOnUse">
          <path d="M 1 0 L 0 0 0 1" fill="none" stroke="#1e293b" strokeWidth="0.02" />
        </pattern>
        <filter id="glow">
          <feGaussianBlur stdDeviation="0.08" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <filter id="dangerGlow">
          <feGaussianBlur stdDeviation="0.06" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width={w} height={h} fill="url(#grid)" />

      {showWindOverlay &&
        windField.segments.map((seg, i) => {
          const cx = seg.region.x + seg.region.width / 2
          const cy = seg.region.y + seg.region.height / 2
          const rad = (seg.direction * Math.PI) / 180
          const arrowLen = 0.2 + (seg.speed / maxWindSpeed) * 0.15
          const dx = Math.sin(rad) * arrowLen
          const dy = -Math.cos(rad) * arrowLen
          const color = windSpeedColor(seg.speed, maxWindSpeed)

          return (
            <g key={`wind-${i}`}>
              <rect
                x={seg.region.x}
                y={seg.region.y}
                width={seg.region.width}
                height={seg.region.height}
                fill="transparent"
                stroke="#334155"
                strokeWidth="0.01"
                strokeDasharray="0.05 0.05"
              />
              <line
                x1={cx - dx}
                y1={cy - dy}
                x2={cx + dx}
                y2={cy + dy}
                stroke={color}
                strokeWidth="0.06"
                strokeLinecap="round"
                opacity={0.7}
              />
              <polygon
                points={`0,0 -0.08,0.14 0.08,0.14`}
                fill={color}
                opacity={0.7}
                transform={`translate(${cx + dx},${cy + dy}) rotate(${seg.direction})`}
              />
            </g>
          )
        })}

      {windChanges.map((wc, i) => {
        const { region } = wc
        return (
          <g key={`wc-${i}`}>
            <rect
              x={region.x}
              y={region.y}
              width={region.width}
              height={region.height}
              fill="rgba(6,214,160,0.05)"
              stroke="#06d6a0"
              strokeWidth="0.04"
              strokeDasharray="0.15 0.1"
            >
              <animate
                attributeName="stroke-dashoffset"
                from="0"
                to="0.5"
                dur="1.5s"
                repeatCount="indefinite"
              />
            </rect>
            <text
              x={region.x + region.width / 2}
              y={region.y + region.height / 2}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#06d6a0"
              fontSize="0.3"
              fontFamily="sans-serif"
              opacity={0.9}
            >
              风场已变更
            </text>
          </g>
        )
      })}

      {noFlyZones.map((zone) => (
        <g key={zone.id}>
          <polygon
            points={zone.vertices.map(v => `${v.x},${v.y}`).join(' ')}
            fill="rgba(239,68,68,0.15)"
            stroke="#ef4444"
            strokeWidth="0.04"
            strokeDasharray="0.12 0.06"
            filter="url(#dangerGlow)"
          />
          <text
            x={zone.vertices.reduce((s, v) => s + v.x, 0) / zone.vertices.length}
            y={zone.vertices.reduce((s, v) => s + v.y, 0) / zone.vertices.length}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#ef4444"
            fontSize="0.28"
            fontFamily="sans-serif"
            opacity={0.8}
          >
            {zone.label}
          </text>
        </g>
      ))}

      {plannedPath.length > 1 && (
        <polyline
          points={plannedPath.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#06d6a0"
          strokeWidth="0.04"
          strokeDasharray="0.15 0.08"
          opacity={0.7}
          filter="url(#glow)"
        />
      )}

      {waypoints.map((wp, i) => (
        <g key={wp.id}>
          <circle
            cx={wp.x}
            cy={wp.y}
            r="0.22"
            fill="none"
            stroke="#06d6a0"
            strokeWidth="0.04"
            filter="url(#glow)"
          />
          <circle
            cx={wp.x}
            cy={wp.y}
            r="0.12"
            fill="#06d6a0"
            opacity={0.8}
          />
          <text
            x={wp.x}
            y={wp.y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#0f172a"
            fontSize="0.18"
            fontWeight="bold"
            fontFamily="sans-serif"
          >
            {i + 1}
          </text>
        </g>
      ))}

      {home && (
        <polygon
          points={`${home.x},${home.y - 0.2} ${home.x + 0.15},${home.y} ${home.x},${home.y + 0.2} ${home.x - 0.15},${home.y}`}
          fill="#22c55e"
          stroke="#4ade80"
          strokeWidth="0.03"
          filter="url(#glow)"
        />
      )}

      {trail.length > 1 && (
        <polyline
          points={trail.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#06d6a0"
          strokeWidth="0.03"
          opacity={0.3}
        />
      )}

      {dronePosition && (
        <g transform={`translate(${dronePosition.x},${dronePosition.y}) rotate(${droneHeading})`}>
          <polygon
            points="0,-0.25 -0.15,0.15 0,0.08 0.15,0.15"
            fill="#06d6a0"
            stroke="#34d399"
            strokeWidth="0.02"
            filter="url(#glow)"
          />
        </g>
      )}
    </svg>
  )
}
