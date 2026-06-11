import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { DisplayCase } from '@/types'

interface DisplayCaseProps {
  displayCase: DisplayCase
}

export function DisplayCaseMesh({ displayCase }: DisplayCaseProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glassRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (glassRef.current) {
      const material = glassRef.current.material as THREE.MeshPhysicalMaterial
      material.opacity = 0.15 + Math.sin(state.clock.elapsedTime * 0.5) * 0.05
    }
  })

  const { position, width, height, depth, color } = displayCase

  return (
    <group position={[position.x, position.y, position.z]}>
      <mesh ref={meshRef} position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial
          color={color}
          metalness={0.3}
          roughness={0.6}
          transparent
          opacity={0.85}
        />
      </mesh>

      <mesh ref={glassRef} position={[0, height / 2, 0]}>
        <boxGeometry args={[width * 0.9, height * 0.85, depth * 0.9]} />
        <meshPhysicalMaterial
          color="#ffffff"
          transparent
          opacity={0.15}
          metalness={0.1}
          roughness={0.1}
          transmission={0.9}
          thickness={0.5}
        />
      </mesh>

      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[width + 0.2, 0.1, depth + 0.2]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.5} />
      </mesh>

      <mesh position={[0, height + 0.05, 0]}>
        <boxGeometry args={[width + 0.1, 0.1, depth + 0.1]} />
        <meshStandardMaterial color="#334155" metalness={0.6} roughness={0.4} />
      </mesh>
    </group>
  )
}
