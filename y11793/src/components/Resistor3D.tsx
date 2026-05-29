import type { ColorRepresentation, Vector3 as Vector3Type } from 'three'
import { useMemo, useState } from 'react'
import { TubeGeometry, CatmullRomCurve3, Vector3 } from 'three'
import { Html } from '@react-three/drei'

interface Resistor3DProps {
  position: Vector3Type | [number, number, number]
  color: ColorRepresentation
  label: string
  value: number
  bounds: [number, number]
  isSelected?: boolean
  onClick?: () => void
}

export default function Resistor3D({
  position,
  color,
  label,
  value,
  bounds,
  isSelected = false,
  onClick,
}: Resistor3DProps) {
  const [hovered, setHovered] = useState(false)

  const spiralGeometry = useMemo(() => {
    const points: Vector3[] = []
    const turns = 6
    const height = 0.8
    const radius = 0.15
    const segments = turns * 32

    for (let i = 0; i <= segments; i++) {
      const t = i / segments
      const angle = t * turns * Math.PI * 2
      const x = Math.cos(angle) * radius
      const y = (t - 0.5) * height
      const z = Math.sin(angle) * radius
      points.push(new Vector3(x, y, z))
    }

    const curve = new CatmullRomCurve3(points, false, 'catmullrom', 0.5)
    return new TubeGeometry(curve, 128, 0.04, 8, false)
  }, [])

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
          <mesh geometry={spiralGeometry}>
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={hovered || isSelected ? 0.8 : 0.2}
              metalness={0.6}
              roughness={0.4}
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
                  {value.toExponential(2)} Ω
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
