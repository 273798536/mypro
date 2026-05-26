import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Rack } from '../../types/scene'
import { getTemperatureColor } from '../../utils/colorScale'

interface TempCloudProps {
  racks: Rack[]
}

export function TempCloud({ racks }: TempCloudProps) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, colors } = useMemo(() => {
    const particleCount = 2000
    const positions = new Float32Array(particleCount * 3)
    const colors = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const rack = racks[Math.floor(Math.random() * racks.length)]
      const spread = 2
      
      const x = rack.position.x + (Math.random() - 0.5) * spread
      const y = 0.5 + Math.random() * 2
      const z = rack.position.z + (Math.random() - 0.5) * spread

      const baseTemp = rack.outletTemp
      const tempVariation = (Math.random() - 0.5) * 4
      const temp = baseTemp + tempVariation

      const color = getTemperatureColor(temp)

      positions[i * 3] = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z

      colors[i * 3] = color.r
      colors[i * 3 + 1] = color.g
      colors[i * 3 + 2] = color.b
    }

    return { positions, colors }
  }, [racks])

  useFrame((state) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
      const time = state.clock.elapsedTime
      
      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] += Math.sin(time + i * 0.01) * 0.002
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.15}
        vertexColors
        transparent
        opacity={0.4}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
