import { useMemo } from 'react'
import { Line, Html } from '@react-three/drei'
import * as THREE from 'three'
import type { ForbiddenZone as ForbiddenZoneType } from '@/types'

const LEVEL_COLORS: Record<string, string> = {
  critical: '#EF4444',
  warning: '#F59E0B',
  caution: '#EAB308',
}

export default function ForbiddenZone({ zone, showLabel = true }: { zone: ForbiddenZoneType; showLabel?: boolean }) {
  const { center, size, rotationY } = useMemo(() => {
    const boundary = zone.boundary
    if (boundary.length === 0) {
      return { center: [0, 0, 0] as [number, number, number], size: [1, 1] as [number, number], rotationY: 0 }
    }

    const xs = boundary.map((p) => p[0])
    const zs = boundary.map((p) => p[2])
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minZ = Math.min(...zs)
    const maxZ = Math.max(...zs)

    const cx = (minX + maxX) / 2
    const cz = (minZ + maxZ) / 2
    const cy = boundary[0][1]

    const w = maxX - minX || 0.5
    const d = maxZ - minZ || 0.5

    return {
      center: [cx, cy, cz] as [number, number, number],
      size: [w, d] as [number, number],
      rotationY: 0,
    }
  }, [zone.boundary])

  const color = LEVEL_COLORS[zone.level] ?? '#EF4444'

  const outlinePoints = useMemo(() => {
    const b = zone.boundary
    if (b.length < 3) return null
    return [...b, b[0]]
  }, [zone.boundary])

  return (
    <group>
      <mesh position={center} rotation={[-Math.PI / 2, 0, rotationY]}>
        <planeGeometry args={[size[0], size[1]]} />
        <meshBasicMaterial color={color} transparent opacity={0.15} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      {outlinePoints && outlinePoints.length >= 2 && (
        <Line
          points={outlinePoints}
          color={color}
          lineWidth={2}
          transparent
          opacity={0.6}
        />
      )}

      {showLabel && (
        <Html
          position={center}
          center
          distanceFactor={10}
          style={{
            color: 'white',
            fontSize: '11px',
            fontFamily: 'monospace',
            background: `${color}CC`,
            padding: '2px 6px',
            borderRadius: '3px',
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          [禁区] {zone.name} ⊗ {zone.level}
        </Html>
      )}
    </group>
  )
}
