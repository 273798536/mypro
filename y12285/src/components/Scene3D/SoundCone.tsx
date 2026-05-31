import * as THREE from 'three'
import type { Musician } from '@/data/sampleData'

interface SoundConeProps {
  musician: Musician
  visible: boolean
}

export function SoundCone({ musician, visible }: SoundConeProps) {
  if (!visible) return null

  const coneLength = musician.soundPressure / 20
  if (coneLength <= 0) return null

  const halfAngleRad = ((musician.radiationAngle / 2) * Math.PI) / 180
  const baseRadius = Math.tan(halfAngleRad) * coneLength

  return (
    <mesh
      position={[
        musician.position.x,
        musician.position.y + 0.6,
        musician.position.z + coneLength / 2,
      ]}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      <coneGeometry args={[baseRadius, coneLength, 32, 1, true]} />
      <meshStandardMaterial
        color="#4fc3f7"
        transparent
        opacity={0.15}
        side={THREE.DoubleSide}
        depthWrite={false}
      />
    </mesh>
  )
}
