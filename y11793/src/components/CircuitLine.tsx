import type { ColorRepresentation, Vector3 } from 'three'
import { useMemo } from 'react'
import { TubeGeometry, CatmullRomCurve3 } from 'three'

interface CircuitLineProps {
  points: Vector3[]
  color: ColorRepresentation
  opacity?: number
}

export default function CircuitLine({ points, color, opacity = 1 }: CircuitLineProps) {
  const geometry = useMemo(() => {
    const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    return new TubeGeometry(curve, 64, 0.03, 8, false)
  }, [points])

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={2}
        transparent
        opacity={opacity}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  )
}
