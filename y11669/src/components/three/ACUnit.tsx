import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, Group } from 'three'
import type { ACUnit as ACUnitType } from '../../types/scene'
import { getStatusColor } from '../../utils/colorScale'

interface ACUnitProps {
  acUnit: ACUnitType
}

export function ACUnit({ acUnit }: ACUnitProps) {
  const groupRef = useRef<Group>(null)
  const fanRef = useRef<Mesh>(null)

  useFrame((state) => {
    if (fanRef.current && acUnit.running) {
      fanRef.current.rotation.z += 0.1 * (acUnit.fanSpeed / 100)
    }
  })

  const statusColor = getStatusColor(acUnit.status)

  return (
    <group ref={groupRef} position={[acUnit.position.x, acUnit.position.y, acUnit.position.z]}>
      <mesh position={[0, acUnit.size.height / 2, 0]} castShadow>
        <boxGeometry args={[acUnit.size.width, acUnit.size.height, acUnit.size.depth]} />
        <meshStandardMaterial
          color="#1a2a3a"
          metalness={0.5}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0, acUnit.size.height / 2, acUnit.size.depth / 2 + 0.01]}>
        <boxGeometry args={[acUnit.size.width * 0.8, acUnit.size.height * 0.6, 0.05]} />
        <meshStandardMaterial
          color="#0a1628"
          emissive="#00E5FF"
          emissiveIntensity={acUnit.running ? 0.3 : 0.1}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>

      <group position={[0, acUnit.size.height * 0.5, acUnit.size.depth / 2 + 0.1]}>
        <mesh ref={fanRef}>
          <cylinderGeometry args={[0.3, 0.3, 0.05, 8]} />
          <meshStandardMaterial
            color="#2196F3"
            emissive="#2196F3"
            emissiveIntensity={acUnit.running ? 0.5 : 0.1}
          />
        </mesh>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[0, 0, (Math.PI / 2) * i]}>
            <boxGeometry args={[0.02, 0.25, 0.02]} />
            <meshStandardMaterial color="#00E5FF" />
          </mesh>
        ))}
      </group>

      <mesh position={[0, acUnit.size.height + 0.1, 0]}>
        <boxGeometry args={[acUnit.size.width * 0.8, 0.05, 0.02]} />
        <meshBasicMaterial color={statusColor} />
      </mesh>

      {acUnit.dataLagSeconds > 60 && (
        <mesh position={[acUnit.size.width / 2 + 0.15, acUnit.size.height - 0.3, 0]}>
          <sphereGeometry args={[0.1, 16, 16]} />
          <meshBasicMaterial color="#FF9800" />
        </mesh>
      )}
    </group>
  )
}
