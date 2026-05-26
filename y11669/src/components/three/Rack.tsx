import { useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { Rack as RackType } from '../../types/scene'
import { getTemperatureHex, getStatusColor } from '../../utils/colorScale'
import { useSceneStore } from '../../store/useSceneStore'

interface RackProps {
  rack: RackType
}

export function Rack({ rack }: RackProps) {
  const meshRef = useRef<Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const { selectedRackId, setSelectedRackId } = useSceneStore()
  const isSelected = selectedRackId === rack.id

  useFrame((state) => {
    if (meshRef.current && isSelected) {
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.02
    }
  })

  const statusColor = getStatusColor(rack.status)
  const tempColor = getTemperatureHex(rack.outletTemp)
  const loadPercent = (rack.currentPower / rack.maxPower) * 100

  return (
    <group position={[rack.position.x, rack.position.y, rack.position.z]}>
      <mesh
        ref={meshRef}
        position={[0, rack.size.height / 2, 0]}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={(e) => {
          e.stopPropagation()
          setSelectedRackId(isSelected ? null : rack.id)
        }}
        castShadow
      >
        <boxGeometry args={[rack.size.width, rack.size.height, rack.size.depth]} />
        <meshStandardMaterial
          color={isSelected ? '#2196F3' : hovered ? '#1a3a5c' : '#0f1e32'}
          transparent
          opacity={isSelected ? 0.9 : 0.7}
          emissive={isSelected ? '#2196F3' : hovered ? '#2196F3' : '#000000'}
          emissiveIntensity={isSelected ? 0.3 : hovered ? 0.15 : 0}
          metalness={0.3}
          roughness={0.7}
        />
      </mesh>

      <mesh position={[0, rack.size.height + 0.1, 0]}>
        <boxGeometry args={[rack.size.width * 0.8, 0.05, 0.02]} />
        <meshBasicMaterial color={statusColor} transparent opacity={0.9} />
      </mesh>

      <mesh position={[0, rack.size.height * 0.7, rack.size.depth / 2 + 0.01]}>
        <boxGeometry args={[rack.size.width * 0.7, 0.08, 0.01]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh
        position={[
          -rack.size.width * 0.35 + (rack.size.width * 0.7 * loadPercent) / 100 / 2,
          rack.size.height * 0.7,
          rack.size.depth / 2 + 0.02,
        ]}
      >
        <boxGeometry args={[rack.size.width * 0.7 * (loadPercent / 100), 0.06, 0.01]} />
        <meshBasicMaterial color={loadPercent > 80 ? '#F44336' : loadPercent > 60 ? '#FF9800' : '#4CAF50'} />
      </mesh>

      <mesh position={[0, rack.size.height * 0.3, rack.size.depth / 2 + 0.01]}>
        <boxGeometry args={[rack.size.width * 0.7, 0.08, 0.01]} />
        <meshBasicMaterial color="#333" />
      </mesh>
      <mesh
        position={[
          0,
          rack.size.height * 0.3,
          rack.size.depth / 2 + 0.02,
        ]}
      >
        <boxGeometry args={[rack.size.width * 0.65, 0.06, 0.01]} />
        <meshBasicMaterial color={tempColor} />
      </mesh>

      {rack.hasAlert && (
        <mesh position={[rack.size.width / 2 + 0.1, rack.size.height - 0.2, 0]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshBasicMaterial color="#F44336" />
        </mesh>
      )}
    </group>
  )
}
