import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { Alert } from '../../types/scene'
import { getAlertLevelColor } from '../../utils/colorScale'
import { useSceneStore } from '../../store/useSceneStore'

interface AlertMarkerProps {
  alert: Alert
}

export function AlertMarker({ alert }: AlertMarkerProps) {
  const meshRef = useRef<Mesh>(null)
  const { setSelectedAlertId, selectedAlertId } = useSceneStore()
  const isSelected = selectedAlertId === alert.id

  useFrame((state) => {
    if (meshRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2
      meshRef.current.scale.setScalar(scale)
      meshRef.current.position.y = alert.position.y + Math.sin(state.clock.elapsedTime * 2) * 0.1
    }
  })

  const color = getAlertLevelColor(alert.level)

  return (
    <group position={[alert.position.x, alert.position.y, alert.position.z]}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedAlertId(isSelected ? null : alert.id)
        }}
      >
        <coneGeometry args={[0.15, 0.4, 6]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={alert.status === 'resolved' ? 0.3 : 0.8}
        />
      </mesh>

      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.08, 16, 16]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={alert.status === 'resolved' ? 0.2 : 0.6}
        />
      </mesh>

      {isSelected && (
        <mesh position={[0, 0.8, 0]}>
          <ringGeometry args={[0.2, 0.25, 32]} />
          <meshBasicMaterial color="#2196F3" side={2} transparent opacity={0.8} />
        </mesh>
      )}
    </group>
  )
}
