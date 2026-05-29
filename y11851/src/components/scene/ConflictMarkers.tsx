import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { CONFLICT_TYPE_LABELS, CONFLICT_SEVERITY_COLORS } from '@/types'
import type { ConflictRecord } from '@/types'

function ConflictPulse({ conflict, isSelected }: {
  conflict: ConflictRecord
  isSelected: boolean
}) {
  const ringRef = useRef<THREE.Mesh>(null)
  const color = CONFLICT_SEVERITY_COLORS[conflict.severity]

  useFrame((_, delta) => {
    if (ringRef.current) {
      const scale = 1 + Math.sin(Date.now() * 0.005) * 0.3
      ringRef.current.scale.set(scale, scale, scale)
      ringRef.current.rotation.z += delta * 0.5
    }
  })

  return (
    <group position={conflict.position}>
      <mesh ref={ringRef}>
        <ringGeometry args={[0.3, 0.5, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isSelected ? 0.9 : 0.6}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[0.25, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 1.2 : 0.6}
          transparent
          opacity={0.8}
        />
      </mesh>
      {isSelected && (
        <Html position={[0, 1.5, 0]} center distanceFactor={50}>
          <div
            className="px-3 py-2 rounded-lg text-xs max-w-64"
            style={{
              background: 'rgba(26,35,50,0.92)',
              border: `1px solid ${color}`,
              color: '#fff',
              backdropFilter: 'blur(8px)',
            }}
          >
            <div className="font-mono font-bold mb-1" style={{ color }}>
              {CONFLICT_TYPE_LABELS[conflict.type]} - {conflict.severity === 'high' ? '高风险' : conflict.severity === 'medium' ? '中风险' : '低风险'}
            </div>
            <div className="leading-tight opacity-90" style={{ fontSize: '10px' }}>
              {conflict.description}
            </div>
          </div>
        </Html>
      )}
    </group>
  )
}

export default function ConflictMarkers() {
  const showConflicts = useStore((s) => s.showConflicts)
  const conflicts = useStore((s) => s.conflicts)
  const selectedConflictId = useStore((s) => s.selectedConflictId)
  const selectConflict = useStore((s) => s.selectConflict)
  const layerVisibility = useStore((s) => s.layerVisibility)

  if (!showConflicts || !layerVisibility.conflicts) return null

  return (
    <group>
      {conflicts.map((c) => (
        <group key={c.id} onClick={() => selectConflict(c.id === selectedConflictId ? null : c.id)}>
          <ConflictPulse conflict={c} isSelected={c.id === selectedConflictId} />
        </group>
      ))}
    </group>
  )
}
