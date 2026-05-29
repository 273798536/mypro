import { useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { useStore } from '@/store/useStore'
import type { Warehouse } from '@/types'

export default function ServiceRadius({ warehouse }: { warehouse: Warehouse }) {
  const meshRef = useRef<THREE.Mesh>(null)
  const selectedWarehouseId = useStore(s => s.selectedWarehouseId)
  const isSelected = selectedWarehouseId === warehouse.id
  const isIsolated = warehouse.status === 'isolated'

  const [x, y, z] = warehouse.position
  const baseColor = isIsolated ? '#ff6b35' : '#4ecdc4'
  const baseOpacity = isSelected ? 0.15 : 0.08

  useFrame((state) => {
    if (meshRef.current) {
      const mat = meshRef.current.material as THREE.MeshStandardMaterial
      const pulse = Math.sin(state.clock.elapsedTime * 1.5) * 0.02
      mat.opacity = baseOpacity + pulse
    }
  })

  return (
    <group position={[x, y, z]}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[warehouse.serviceRadius, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial
          color={baseColor}
          transparent
          opacity={baseOpacity}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {isIsolated && (
        <mesh>
          <sphereGeometry args={[warehouse.serviceRadius, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#e91e63" wireframe transparent opacity={0.4} />
        </mesh>
      )}
    </group>
  )
}
