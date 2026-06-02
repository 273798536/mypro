import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Valve as ValveType } from '@/types'
import { useAppStore } from '@/store/useAppStore'

const STATUS_COLORS: Record<string, string> = {
  normal: '#22C55E',
  duplicate: '#EF4444',
  mismatch: '#EAB308',
  maintenance: '#94A3B8',
}

function PulseMaterial({ color }: { color: string }) {
  const ref = useRef<THREE.MeshStandardMaterial>(null)

  useFrame((state) => {
    if (ref.current) {
      const s = 0.6 + 0.4 * Math.sin(state.clock.elapsedTime * 4)
      ref.current.emissiveIntensity = s
    }
  })

  return (
    <meshStandardMaterial
      ref={ref}
      color={color}
      emissive={color}
      emissiveIntensity={0.6}
    />
  )
}

function getLabel(valve: ValveType): string {
  switch (valve.status) {
    case 'duplicate':
      return `[重号] ${valve.tagNumber} ⚠`
    case 'mismatch':
      return `[不一致] 模型:${valve.modelRemark} 实际:${valve.tagNumber}`
    default:
      return `[编号] ${valve.tagNumber} ✓`
  }
}

export default function Valve({ valve, showLabel = true }: { valve: ValveType; showLabel?: boolean }) {
  const selectedValveId = useAppStore((s) => s.selectedValveId)
  const setSelectedValve = useAppStore((s) => s.setSelectedValve)
  const color = STATUS_COLORS[valve.status] ?? '#94A3B8'
  const isSelected = selectedValveId === valve.id

  return (
    <group
      position={valve.position}
      onClick={(e) => {
        e.stopPropagation()
        setSelectedValve(valve.id)
      }}
    >
      <mesh position={[0, 0, 0]}>
        <cylinderGeometry args={[0.06, 0.06, 0.2, 16]} />
        {valve.status === 'duplicate' ? (
          <PulseMaterial color={color} />
        ) : (
          <meshStandardMaterial color={color} />
        )}
      </mesh>

      <mesh position={[0, 0.18, 0]} rotation={[0, 0, 0]}>
        <torusGeometry args={[0.08, 0.015, 8, 16]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.4} />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} />
        </mesh>
      )}

      {showLabel && (
        <Html
          position={[0, 0.4, 0]}
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
          {getLabel(valve)}
        </Html>
      )}
    </group>
  )
}
