import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line } from '@react-three/drei'
import * as THREE from 'three'
import type { TrajectoryPoint, TrajectoryAnnotation } from '@/store'

function speedToColor(speed: number, min: number, max: number): string {
  const t = max > min ? (speed - min) / (max - min) : 0.5
  const r = Math.round(t * 255)
  const b = Math.round((1 - t) * 255)
  return `rgb(${r},80,${b})`
}

function TrajectoryLine({
  points,
  minSpeed,
  maxSpeed,
  rangeStart,
  rangeEnd,
}: {
  points: TrajectoryPoint[]
  minSpeed: number
  maxSpeed: number
  rangeStart: number
  rangeEnd: number
}) {
  const groupRef = useRef<THREE.Group>(null)

  const segments = useMemo(() => {
    const result: { start: THREE.Vector3; end: THREE.Vector3; color: string }[] = []
    for (let i = Math.max(0, rangeStart); i < Math.min(points.length - 1, rangeEnd); i++) {
      const p1 = points[i]
      const p2 = points[i + 1]
      const avgSpeed = (p1.speed + p2.speed) / 2
      result.push({
        start: new THREE.Vector3(p1.x, p1.z, p1.y),
        end: new THREE.Vector3(p2.x, p2.z, p2.y),
        color: speedToColor(avgSpeed, minSpeed, maxSpeed),
      })
    }
    return result
  }, [points, minSpeed, maxSpeed, rangeStart, rangeEnd])

  useFrame(() => {
    if (groupRef.current) groupRef.current.updateMatrixWorld(true)
  })

  return (
    <group ref={groupRef}>
      {segments.map((seg, i) => (
        <Line
          key={i}
          points={[seg.start, seg.end]}
          color={seg.color}
          lineWidth={3}
        />
      ))}
    </group>
  )
}

function AnnotationMarkers({
  annotations,
  points,
  highlightedIndex,
}: {
  annotations: TrajectoryAnnotation[]
  points: TrajectoryPoint[]
  highlightedIndex: number | null
}) {
  return (
    <>
      {annotations.map((ann) => {
        const pt = points[ann.point_index]
        if (!pt) return null
        const isHighlighted = highlightedIndex === ann.point_index
        return (
          <group key={ann.id} position={[pt.x, pt.z + 0.05, pt.y]}>
            <mesh>
              <sphereGeometry args={[isHighlighted ? 0.06 : 0.04, 16, 16]} />
              <meshStandardMaterial
                color={ann.type === 'speed_change' ? '#F59E0B' : '#3B82F6'}
                emissive={isHighlighted ? '#FFFFFF' : '#000000'}
                emissiveIntensity={isHighlighted ? 0.5 : 0}
              />
            </mesh>
            <Html
              center
              distanceFactor={8}
              style={{
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
              }}
            >
              <div
                className={`px-2 py-1 rounded text-xs font-medium shadow-sm ${
                  isHighlighted
                    ? 'bg-amber-500 text-white'
                    : 'bg-white/90 text-slate-700'
                }`}
              >
                {ann.label}
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

function SpeedLabels({
  points,
  minSpeed,
  maxSpeed,
  interval,
}: {
  points: TrajectoryPoint[]
  minSpeed: number
  maxSpeed: number
  interval: number
}) {
  const labeledPoints = useMemo(
    () => points.filter((_, i) => i % interval === 0),
    [points, interval]
  )

  return (
    <>
      {labeledPoints.map((pt, i) => (
        <Html
          key={i}
          position={[pt.x, pt.z + 0.12, pt.y]}
          center
          distanceFactor={10}
          style={{ pointerEvents: 'none' }}
        >
          <div className="px-1.5 py-0.5 rounded bg-slate-800/70 text-white text-[10px] font-mono">
            {pt.speed.toFixed(2)}
          </div>
        </Html>
      ))}
    </>
  )
}

export default function TrajectoryScene({
  points,
  annotations,
  highlightedIndex,
  rangeStart,
  rangeEnd,
}: {
  points: TrajectoryPoint[]
  annotations: TrajectoryAnnotation[]
  highlightedIndex: number | null
  rangeStart: number
  rangeEnd: number
}) {
  const { minSpeed, maxSpeed } = useMemo(() => {
    if (points.length === 0) return { minSpeed: 0, maxSpeed: 1 }
    return {
      minSpeed: Math.min(...points.map((p) => p.speed)),
      maxSpeed: Math.max(...points.map((p) => p.speed)),
    }
  }, [points])

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow />

      <gridHelper args={[4, 20, '#CBD5E1', '#E2E8F0']} rotation={[0, 0, 0]} />

      <TrajectoryLine
        points={points}
        minSpeed={minSpeed}
        maxSpeed={maxSpeed}
        rangeStart={rangeStart}
        rangeEnd={rangeEnd}
      />

      <AnnotationMarkers
        annotations={annotations}
        points={points}
        highlightedIndex={highlightedIndex}
      />

      <SpeedLabels
        points={points}
        minSpeed={minSpeed}
        maxSpeed={maxSpeed}
        interval={10}
      />
    </>
  )
}
