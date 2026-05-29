import type { ColorRepresentation, Vector3 as Vector3Type } from 'three'
import { useState } from 'react'
import { Html } from '@react-three/drei'

interface Capacitor3DProps {
  position: Vector3Type | [number, number, number]
  color: ColorRepresentation
  label: string
  value: number
  bounds: [number, number]
  isSelected?: boolean
  onClick?: () => void
}

export default function Capacitor3D({
  position,
  color,
  label,
  value,
  bounds,
  isSelected = false,
  onClick,
}: Capacitor3DProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <group position={position}>
      <group
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
      >
          <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[0.8, 0.08, 0.6]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered || isSelected ? 0.6 : 0.1}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        <mesh position={[0, -0.25, 0]}>
          <boxGeometry args={[0.8, 0.08, 0.6]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={hovered || isSelected ? 0.6 : 0.1}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>

        <mesh position={[0, 0.55, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
          <meshStandardMaterial
            color="#64748b"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <mesh position={[0, -0.55, 0]}>
          <cylinderGeometry args={[0.08, 0.08, 0.3, 16]} />
          <meshStandardMaterial
            color="#64748b"
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>

        <mesh position={[0, 0.75, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />
          <meshStandardMaterial
            color="#94a3b8"
            emissive={isSelected ? '#fbbf24' : '#64748b'}
            emissiveIntensity={isSelected ? 0.5 : 0}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

        <mesh position={[0, -0.75, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.2, 16]} />
          <meshStandardMaterial
            color="#94a3b8"
            emissive={isSelected ? '#fbbf24' : '#64748b'}
            emissiveIntensity={isSelected ? 0.5 : 0}
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>

          {(hovered || isSelected) && (
            <Html
              position={[0.6, 0, 0]}
              center
              distanceFactor={6}
              style={{ pointerEvents: 'none' }}
            >
              <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[140px]">
                <div className="text-xs font-semibold text-slate-300 mb-1">{label}</div>
                <div className="text-lg font-bold text-white">
                  {value.toExponential(2)} F
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  范围: [{bounds[0].toExponential(1)}, {bounds[1].toExponential(1)}]
                </div>
              </div>
            </Html>
          )}
        </group>
    </group>
  )
}
