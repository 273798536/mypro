import { useRef } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

interface Fixture3DProps {
  fixtureId: string
  barId: string
  offsetX: number
  offsetY: number
  offsetZ: number
  fixtureType: string
  barPositionX: number
  barPositionY: number
  barPositionZ: number
  barLength: number
}

export default function Fixture3D({
  offsetX, offsetY, barPositionX, barPositionY, barPositionZ, barLength, fixtureType,
}: Fixture3DProps) {
  const groupRef = useRef<THREE.Group>(null)

  const fixtureColor: Record<string, string> = {
    '面光': '#FFD700',
    '顶光': '#87CEEB',
    '侧光': '#98FB98',
    '追光': '#FFA500',
    '逆光': '#DDA0DD',
    '染色': '#FF69B4',
    '电脑灯': '#00CED1',
    '光束': '#FF4500',
    '频闪': '#FFFFFF',
  }

  const x = barPositionX + barLength / 2 + offsetX
  const y = barPositionY + offsetY

  return (
    <group ref={groupRef} position={[x, y, barPositionZ]}>
      <mesh castShadow>
        <boxGeometry args={[0.2, 0.25, 0.2]} />
        <meshStandardMaterial
          color={fixtureColor[fixtureType] || '#CCCCCC'}
          metalness={0.6}
          roughness={0.4}
          emissive={fixtureColor[fixtureType] || '#CCCCCC'}
          emissiveIntensity={0.1}
        />
      </mesh>
      <mesh position={[0, -0.18, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.08, 0.06, 0.1, 8]} />
        <meshStandardMaterial color="#333333" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}
