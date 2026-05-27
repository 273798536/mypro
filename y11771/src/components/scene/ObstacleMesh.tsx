import * as THREE from 'three'
import type { Obstacle } from '@/utils/kinematics'

function SphereObstacle({ obstacle }: { obstacle: Obstacle }) {
  const radius = obstacle.size as number
  return (
    <mesh position={obstacle.position}>
      <sphereGeometry args={[radius, 24, 24]} />
      <meshStandardMaterial
        color="#ff4444"
        transparent
        opacity={0.35}
        emissive="#ff2222"
        emissiveIntensity={0.15}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

function BoxObstacle({ obstacle }: { obstacle: Obstacle }) {
  const size = obstacle.size as [number, number, number]
  return (
    <mesh position={obstacle.position}>
      <boxGeometry args={size} />
      <meshStandardMaterial
        color="#ff6644"
        transparent
        opacity={0.35}
        emissive="#ff4422"
        emissiveIntensity={0.15}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function ObstacleMesh({ obstacle }: { obstacle: Obstacle }) {
  if (obstacle.type === 'sphere') return <SphereObstacle obstacle={obstacle} />
  if (obstacle.type === 'box') return <BoxObstacle obstacle={obstacle} />
  return null
}
