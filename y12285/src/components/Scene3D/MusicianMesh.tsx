import { useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store/index'
import type { Musician } from '@/data/sampleData'

const SECTION_COLORS: Record<string, string> = {
  strings: '#d4a855',
  woodwinds: '#4fc3f7',
  brass: '#ef8c3a',
  percussion: '#ce93d8',
}

interface MusicianMeshProps {
  musician: Musician
}

export function MusicianMesh({ musician }: MusicianMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const selectedMusicianId = useStore((s) => s.selectedMusicianId)
  const selectMusician = useStore((s) => s.selectMusician)
  const isSelected = musician.id === selectedMusicianId
  const { camera } = useThree()

  useFrame((state) => {
    if (!meshRef.current) return
    if (isSelected) {
      const t = state.clock.elapsedTime
      const material = meshRef.current.material as THREE.MeshStandardMaterial
      material.emissiveIntensity = 0.3 + Math.sin(t * 3) * 0.15
    }
  })

  const color = SECTION_COLORS[musician.section] || '#ffffff'

  return (
    <mesh
      ref={meshRef}
      position={[musician.position.x, musician.position.y + 0.6, musician.position.z]}
      scale={isSelected ? 1.1 : 1}
      onClick={(e) => {
        e.stopPropagation()
        selectMusician(musician.id)
      }}
    >
      <cylinderGeometry args={[0.3, 0.3, 1.2, 16]} />
      <meshStandardMaterial
        color={color}
        emissive={isSelected ? color : '#000000'}
        emissiveIntensity={isSelected ? 0.3 : 0}
      />
      <Html position={[0, 0.8, 0]} center distanceFactor={10}>
        <div
          style={{
            fontSize: '10px',
            color: '#fff',
            whiteSpace: 'nowrap',
            textShadow: '0 0 4px rgba(0,0,0,0.8)',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          {musician.name}
        </div>
      </Html>
    </mesh>
  )
}
