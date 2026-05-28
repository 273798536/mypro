import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface PulleyModelProps {
  position: [number, number, number]
  isMoving: boolean
  radius?: number
}

export default function PulleyModel({ position, isMoving, radius = 0.3 }: PulleyModelProps) {
  const groupRef = useRef<THREE.Group>(null)

  const grooveGeometry = useMemo(() => {
    const shape = new THREE.Shape()
    const outerR = radius
    const innerR = radius * 0.7
    shape.absarc(0, 0, outerR, 0, Math.PI * 2, false)
    const hole = new THREE.Path()
    hole.absarc(0, 0, innerR, 0, Math.PI * 2, true)
    shape.holes.push(hole)
    return new THREE.ExtrudeGeometry(shape, { depth: 0.08, bevelEnabled: false })
  }, [radius])

  const hubGeometry = useMemo(() => {
    return new THREE.CylinderGeometry(radius * 0.15, radius * 0.15, 0.12, 16)
  }, [radius])

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.z += delta * 0.3
    }
  })

  return (
    <group position={position} ref={groupRef}>
      <mesh geometry={grooveGeometry} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.04]}>
        <meshStandardMaterial
          color={isMoving ? '#ff6b35' : '#8899aa'}
          metalness={0.8}
          roughness={0.2}
        />
      </mesh>
      <mesh geometry={hubGeometry} position={[0, 0, 0]}>
        <meshStandardMaterial
          color="#cccccc"
          metalness={0.9}
          roughness={0.1}
        />
      </mesh>
      <mesh position={[0, 0, radius * 0.8 + 0.05]}>
        <boxGeometry args={[0.04, 0.04, 0.3]} />
        <meshStandardMaterial color="#555566" metalness={0.6} roughness={0.3} />
      </mesh>
    </group>
  )
}
