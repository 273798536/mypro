import { useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import { PIPELINE_COLORS, PIPELINE_TYPE_LABELS } from '@/types'
import { manholes } from '@/data/sampleData'
import type { ManholePoint } from '@/types'

function ManholeMarker({ manhole, isHighlighted }: {
  manhole: ManholePoint
  isHighlighted: boolean
}) {
  const groupRef = useRef<THREE.Group>(null)
  const color = isHighlighted ? '#e74c3c' : PIPELINE_COLORS[manhole.type]

  return (
    <group ref={groupRef} position={manhole.position}>
      <mesh position={[0, 0.15, 0]}>
        <cylinderGeometry args={[0.6, 0.6, 0.3, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isHighlighted ? 0.8 : 0.3}
          transparent
          opacity={0.9}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]}>
        <cylinderGeometry args={[0.15, 0.15, 0.5, 8]} />
        <meshStandardMaterial color="#333" />
      </mesh>
      <Html
        position={[0, 1.2, 0]}
        center
        distanceFactor={40}
        style={{ pointerEvents: 'none' }}
      >
        <div
          className="px-2 py-0.5 rounded text-xs font-mono whitespace-nowrap"
          style={{
            background: isHighlighted ? 'rgba(231,76,60,0.9)' : 'rgba(26,35,50,0.85)',
            color: '#fff',
            border: `1px solid ${color}`,
            fontSize: '11px',
          }}
        >
          {manhole.label} | {PIPELINE_TYPE_LABELS[manhole.type]} | 标高{manhole.elevation.toFixed(1)}m
        </div>
      </Html>
    </group>
  )
}

export default function ManholeMarkers() {
  const showManholes = useStore((s) => s.layerVisibility.manholes)
  const highlightedManholeIds = useStore((s) => s.highlightedManholeIds)

  if (!showManholes) return null

  return (
    <group>
      {manholes.map((mh) => (
        <ManholeMarker
          key={mh.id}
          manhole={mh}
          isHighlighted={highlightedManholeIds.includes(mh.id)}
        />
      ))}
    </group>
  )
}
