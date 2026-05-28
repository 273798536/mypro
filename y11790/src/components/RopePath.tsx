import { useMemo } from 'react'
import * as THREE from 'three'

interface RopePathProps {
  fixedPulleys: number
  movingPulleys: number
  pulleyRadius?: number
  weightY?: number
}

export default function RopePath({
  fixedPulleys,
  movingPulleys,
  pulleyRadius = 0.3,
  weightY = -2,
}: RopePathProps) {
  const curve = useMemo(() => {
    const totalSegments = 2 * movingPulleys
    const points: THREE.Vector3[] = []

    const spacing = 0.8
    const topY = 1.5
    const bottomY = weightY + pulleyRadius + 0.3

    const startX = -((totalSegments - 1) * spacing) / 2

    points.push(new THREE.Vector3(startX - 1, topY, 0))

    for (let i = 0; i < totalSegments; i++) {
      const x = startX + i * spacing
      const isFixed = i % 2 === 0
      const y = isFixed ? topY : bottomY

      const angleSteps = 8
      for (let a = 0; a <= angleSteps; a++) {
        const angle = (Math.PI / angleSteps) * a - Math.PI / 2
        points.push(
          new THREE.Vector3(
            x + Math.cos(angle) * pulleyRadius,
            y + Math.sin(angle) * pulleyRadius,
            0
          )
        )
      }
    }

    const endX = startX + (totalSegments - 1) * spacing
    points.push(new THREE.Vector3(endX + 1, topY, 0))

    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.3)
  }, [fixedPulleys, movingPulleys, pulleyRadius, weightY])

  const tubeGeometry = useMemo(() => {
    return new THREE.TubeGeometry(curve, 200, 0.025, 8, false)
  }, [curve])

  return (
    <mesh geometry={tubeGeometry}>
      <meshStandardMaterial
        color="#ff6b35"
        emissive="#ff6b35"
        emissiveIntensity={0.15}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  )
}
