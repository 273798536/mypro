import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { ACUnit } from '../../types/scene'

interface AirflowParticlesProps {
  acUnits: ACUnit[]
}

export function AirflowParticles({ acUnits }: AirflowParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const velocitiesRef = useRef<Float32Array | null>(null)

  const { positions, velocities } = useMemo(() => {
    const particleCount = 500
    const positions = new Float32Array(particleCount * 3)
    const velocities = new Float32Array(particleCount * 3)

    for (let i = 0; i < particleCount; i++) {
      const ac = acUnits[i % acUnits.length]
      
      positions[i * 3] = ac.position.x + (Math.random() - 0.5) * ac.size.width
      positions[i * 3 + 1] = ac.size.height * 0.3 + Math.random() * ac.size.height * 0.4
      positions[i * 3 + 2] = ac.position.z + ac.size.depth / 2

      const targetX = (Math.random() - 0.5) * 15
      const targetZ = (Math.random() - 0.5) * 10
      const dx = targetX - positions[i * 3]
      const dz = targetZ - positions[i * 3 + 2]
      const dist = Math.sqrt(dx * dx + dz * dz)
      
      velocities[i * 3] = (dx / dist) * 0.02
      velocities[i * 3 + 1] = (Math.random() - 0.3) * 0.01
      velocities[i * 3 + 2] = (dz / dist) * 0.02
    }

    return { positions, velocities }
  }, [acUnits])

  velocitiesRef.current = velocities

  useFrame(() => {
    if (pointsRef.current && velocitiesRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array as Float32Array
      const vels = velocitiesRef.current

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += vels[i]
        positions[i + 1] += vels[i + 1]
        positions[i + 2] += vels[i + 2]

        if (Math.abs(positions[i]) > 12 || Math.abs(positions[i + 2]) > 10 || positions[i + 1] > 4) {
          const ac = acUnits[Math.floor(Math.random() * acUnits.length)]
          positions[i] = ac.position.x + (Math.random() - 0.5) * ac.size.width
          positions[i + 1] = ac.size.height * 0.3 + Math.random() * ac.size.height * 0.4
          positions[i + 2] = ac.position.z + ac.size.depth / 2
        }
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
      </bufferGeometry>
      <pointsMaterial
        size={0.08}
        color="#00E5FF"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </points>
  )
}
