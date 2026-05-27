import { useRef, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import { useGraphStore } from '../../stores/graphStore'
import type { RiskSeverity } from '../../types'

interface PersonNodeProps {
  id: string
  position: [number, number, number]
  label: string
  selected: boolean
  hovered: boolean
  filtered: boolean
  riskSeverity?: RiskSeverity
}

export function PersonNode({ id, position, label, selected, hovered, filtered, riskSeverity }: PersonNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const selectNode = useGraphStore((s) => s.selectNode)
  const hoverNode = useGraphStore((s) => s.hoverNode)
  const [pointerOver, setPointerOver] = useState(false)

  const baseColor = riskSeverity === 'high' ? '#EF4444' : riskSeverity === 'medium' ? '#F59E0B' : '#F59E0B'

  const targetScale = selected ? 1.3 : hovered || pointerOver ? 1.15 : 1
  const opacity = filtered ? 0.15 : 1

  useFrame(() => {
    if (!meshRef.current) return
    meshRef.current.scale.lerp({ x: targetScale, y: targetScale, z: targetScale }, 0.15)
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation()
          selectNode(id)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setPointerOver(true)
          hoverNode(id)
        }}
        onPointerOut={() => {
          setPointerOver(false)
          hoverNode(null)
        }}
      >
        <octahedronGeometry args={[0.5, 0]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={selected || hovered || pointerOver ? baseColor : '#000000'}
          emissiveIntensity={selected ? 0.6 : hovered || pointerOver ? 0.3 : 0}
          transparent
          opacity={opacity}
        />
      </mesh>
      <Text
        position={[0, 1, 0]}
        fontSize={0.3}
        color={filtered ? '#ffffff20' : '#ffffff'}
        anchorX="center"
        anchorY="bottom"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {label}
      </Text>
    </group>
  )
}
