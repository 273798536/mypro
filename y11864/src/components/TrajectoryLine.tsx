import { useRef, useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { TrajectoryResult, TrajectoryPoint } from '@/types'
import { useSimStore } from '@/store/useSimStore'

interface TrajectoryLineProps {
  result: TrajectoryResult
  showIdeal?: boolean
}

export default function TrajectoryLine({ result, showIdeal = true }: TrajectoryLineProps) {
  const activeId = useSimStore(s => s.activeTrajectoryId)
  const setActive = useSimStore(s => s.setActiveTrajectory)
  const timelinePos = useSimStore(s => s.timelinePosition)
  const anomalyFilter = useSimStore(s => s.selectedAnomalyFilter)
  const isActive = activeId === result.id

  const hasFilteredAnomaly = result.anomalies.some(a => anomalyFilter.has(a.type))

  const dragPoints = useMemo(() =>
    result.points.map(p => [p.x, p.y, p.z] as [number, number, number]),
    [result.points],
  )

  const idealPoints = useMemo(() =>
    result.idealPoints.map(p => [p.x, p.y, p.z] as [number, number, number]),
    [result.idealPoints],
  )

  const currentPoint = useMemo(() => {
    if (timelinePos <= 0) return null
    const pts = result.points
    for (let i = 1; i < pts.length; i++) {
      if (pts[i].t >= timelinePos) {
        const prev = pts[i - 1]
        const next = pts[i]
        const frac = (timelinePos - prev.t) / (next.t - prev.t)
        return {
          x: prev.x + frac * (next.x - prev.x),
          y: prev.y + frac * (next.y - prev.y),
          z: prev.z + frac * (next.z - prev.z),
        }
      }
    }
    return null
  }, [result.points, timelinePos])

  const hasUndergroundAnomaly = result.anomalies.some(a => a.type === 'underground')
  const hasDivergenceAnomaly = result.anomalies.some(a => a.type === 'divergence')

  if (dragPoints.length < 2) return null

  return (
    <group onClick={() => setActive(result.id)}>
      {showIdeal && idealPoints.length >= 2 && (
        <Line
          points={idealPoints}
          color="#00d4ff"
          lineWidth={isActive ? 3 : 1.5}
          transparent
          opacity={isActive ? 0.8 : 0.35}
          dashed={false}
        />
      )}

      <Line
        points={dragPoints}
        color={hasDivergenceAnomaly ? '#ff3366' : hasUndergroundAnomaly ? '#ff6b35' : '#00ff88'}
        lineWidth={isActive ? 4 : 2}
        transparent
        opacity={hasFilteredAnomaly ? 0.2 : isActive ? 1 : 0.7}
        dashed={hasUndergroundAnomaly || hasDivergenceAnomaly}
        dashSize={0.5}
        gapSize={0.3}
      />

      {isActive && currentPoint && (
        <mesh position={[currentPoint.x, currentPoint.y, currentPoint.z]}>
          <sphereGeometry args={[0.3, 16, 16]} />
          <meshStandardMaterial color="#ffffff" emissive="#00d4ff" emissiveIntensity={2} />
        </mesh>
      )}

      {result.points.length > 0 && (
        <mesh position={[result.points[0].x, result.points[0].y, result.points[0].z]}>
          <coneGeometry args={[0.15, 0.4, 8]} />
          <meshStandardMaterial color="#ffcc00" emissive="#ffcc00" emissiveIntensity={0.5} />
        </mesh>
      )}
    </group>
  )
}
