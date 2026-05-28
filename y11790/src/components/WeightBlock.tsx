import { useMemo } from 'react'
import * as THREE from 'three'

interface WeightBlockProps {
  weight: number
  weightUnit: string
  position?: [number, number, number]
}

export default function WeightBlock({
  weight,
  weightUnit,
  position = [0, -2, 0],
}: WeightBlockProps) {
  const displayWeight = weightUnit === 'g' ? weight : weight
  const size = useMemo(() => {
    const s = Math.max(0.3, Math.min(1.2, 0.3 + displayWeight * 0.02))
    return s
  }, [displayWeight])

  return (
    <group position={position}>
      <mesh position={[0, -size / 2, 0]}>
        <boxGeometry args={[size * 0.8, size, size * 0.6]} />
        <meshStandardMaterial
          color="#445566"
          metalness={0.5}
          roughness={0.4}
        />
      </mesh>
      <mesh position={[0, size * 0.1, size * 0.31]}>
        <planeGeometry args={[size * 0.6, size * 0.3]} />
        <meshBasicMaterial color="#00d4aa" transparent opacity={0.9} />
      </mesh>
      <mesh position={[0, -size * 0.05, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
        <meshStandardMaterial color="#aaaaaa" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>
  )
}
