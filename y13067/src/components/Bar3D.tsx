import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

interface Bar3DProps {
  barId: string
  positionX: number
  positionZ: number
  length: number
  type: string
  isColliding: boolean
  isSelected: boolean
  onClick: () => void
}

export default function Bar3D({ barId, positionX, positionZ, length, type, isColliding, isSelected, onClick }: Bar3DProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const currentFrame = useStore((s) => s.currentFrame)
  const getBarPositionAtFrame = useStore((s) => s.getBarPositionAtFrame)

  const positionY = useMemo(() => getBarPositionAtFrame(barId, currentFrame), [barId, currentFrame, getBarPositionAtFrame])

  const barRadius = type === 'scenery' ? 0.15 : 0.06
  const color = useMemo(() => {
    if (isSelected) return '#E8A838'
    if (isColliding) return '#FF4757'
    if (type === 'scenery') return '#8B7355'
    return '#8899AA'
  }, [isSelected, isColliding, type])

  useFrame((state) => {
    if (glowRef.current && isColliding) {
      const pulse = Math.sin(state.clock.elapsedTime * 3) * 0.5 + 0.5
      ;(glowRef.current.material as THREE.MeshBasicMaterial).opacity = pulse * 0.4
      const s = 1 + pulse * 0.15
      glowRef.current.scale.set(s, 1, s)
    }
  })

  return (
    <group position={[positionX + length / 2, positionY, positionZ]}>
      <mesh
        ref={meshRef}
        rotation={[0, 0, Math.PI / 2]}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[barRadius, barRadius, length, 16]} />
        <meshStandardMaterial
          color={color}
          metalness={type === 'scenery' ? 0.1 : 0.7}
          roughness={type === 'scenery' ? 0.8 : 0.3}
          emissive={isSelected ? '#E8A838' : isColliding ? '#FF4757' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : isColliding ? 0.2 : 0}
        />
      </mesh>
      {isColliding && (
        <mesh ref={glowRef} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[barRadius + 0.12, barRadius + 0.12, length, 16]} />
          <meshBasicMaterial color="#FF4757" transparent opacity={0.2} side={THREE.DoubleSide} />
        </mesh>
      )}
      {isSelected && (
        <lineSegments rotation={[0, 0, Math.PI / 2]}>
          <edgesGeometry args={[new THREE.CylinderGeometry(barRadius + 0.04, barRadius + 0.04, length, 16)]} />
          <lineBasicMaterial color="#E8A838" linewidth={2} />
        </lineSegments>
      )}
    </group>
  )
}
