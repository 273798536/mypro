import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import type { RiskSeverity } from '../../types'

interface RiskHighlightProps {
  position: [number, number, number]
  severity: RiskSeverity
}

export function RiskHighlight({ position, severity }: RiskHighlightProps) {
  const ringRef = useRef<THREE.Mesh>(null)

  const color = severity === 'high' ? '#EF4444' : '#F59E0B'
  const baseRadius = severity === 'high' ? 1.0 : 0.85

  useFrame((state) => {
    if (!ringRef.current) return
    const t = state.clock.elapsedTime
    const pulse = Math.sin(t * 3) * 0.15 + 1
    const scale = baseRadius * pulse
    ringRef.current.scale.set(scale, scale, scale)
    const mat = ringRef.current.material as THREE.MeshBasicMaterial
    mat.opacity = 0.3 + Math.sin(t * 3) * 0.15
  })

  return (
    <group position={position}>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.8, 1.0, 64]} />
        <meshBasicMaterial color={color} transparent opacity={0.4} side={THREE.DoubleSide} />
      </mesh>
    </group>
  )
}
