import { useEffect, useRef } from 'react'
import * as THREE from 'three'
import { Html } from '@react-three/drei'
import { useStore } from '@/store/useStore'

function Building({ position, size, name }: {
  position: [number, number, number]
  size: [number, number, number]
  name: string
}) {
  const solidRef = useRef<THREE.Mesh>(null)
  const wireRef = useRef<THREE.Mesh>(null)
  const centerPos: [number, number, number] = [
    position[0],
    size[1] / 2,
    position[2],
  ]

  useEffect(() => {
    return () => {
      solidRef.current?.geometry.dispose()
      if (solidRef.current?.material instanceof THREE.Material) solidRef.current.material.dispose()
      wireRef.current?.geometry.dispose()
      if (wireRef.current?.material instanceof THREE.Material) wireRef.current.material.dispose()
    }
  }, [])

  return (
    <group position={centerPos}>
      <mesh ref={solidRef}>
        <boxGeometry args={size} />
        <meshStandardMaterial
          color="#648CB4"
          transparent
          opacity={0.3}
          depthWrite={false}
        />
      </mesh>
      <mesh ref={wireRef}>
        <boxGeometry args={size} />
        <meshBasicMaterial color="#648CB4" wireframe />
      </mesh>
      <Html
        position={[0, size[1] / 2 + 2, 0]}
        center
        style={{ pointerEvents: 'none' }}
      >
        <div style={{
          background: 'rgba(0,0,0,0.75)',
          color: '#fff',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 11,
          whiteSpace: 'nowrap',
          fontFamily: 'sans-serif',
        }}>
          {name}
        </div>
      </Html>
    </group>
  )
}

export default function BuildingBlocks() {
  const buildings = useStore(state => state.buildings)

  return (
    <group>
      {buildings.map(b => (
        <Building
          key={b.id}
          position={b.position}
          size={b.size}
          name={b.name}
        />
      ))}
    </group>
  )
}
