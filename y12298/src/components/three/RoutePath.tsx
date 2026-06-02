import { useMemo } from 'react'
import { Line, Html } from '@react-three/drei'
import type { InspectionRoute } from '@/types'

const ROUTE_STYLES: Record<string, { color: string; dashed: boolean; opacity: number }> = {
  active: { color: '#3B82F6', dashed: false, opacity: 1 },
  deprecated: { color: '#6B7280', dashed: true, opacity: 0.7 },
  failed: { color: '#EF4444', dashed: true, opacity: 0.4 },
  draft: { color: '#94A3B8', dashed: true, opacity: 0.5 },
}

export default function RoutePath({ route, showLabel = true }: { route: InspectionRoute; showLabel?: boolean }) {
  const points = useMemo(
    () => route.points.map((p) => p.position),
    [route.points],
  )

  const style = ROUTE_STYLES[route.status] ?? ROUTE_STYLES.draft
  const startPos = route.points[0]?.position

  if (points.length < 2) return null

  return (
    <group>
      <Line
        points={points}
        color={style.color}
        lineWidth={2}
        dashed={style.dashed}
        dashSize={0.3}
        dashOffset={0}
        gapSize={0.15}
        transparent
        opacity={style.opacity}
      />

      {startPos && showLabel && (
        <Html
          position={startPos}
          center
          distanceFactor={10}
          style={{
            color: 'white',
            fontSize: '11px',
            fontFamily: 'monospace',
            background: `${style.color}CC`,
            padding: '2px 6px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {route.version}
        </Html>
      )}
    </group>
  )
}
