import type { ColorRepresentation } from 'three'
import { Edges } from '@react-three/drei'

interface BatteryShellProps {
  opacity?: number
  color?: ColorRepresentation
}

export default function BatteryShell({ opacity = 0.15, color = '#64748b' }: BatteryShellProps) {
  return (
    <group>
      <mesh>
        <boxGeometry args={[5.5, 3.5, 2.5]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          metalness={0.1}
          roughness={0.9}
          side={2}
        />
        <Edges color="#94a3b8" threshold={15} lineWidth={1} />
      </mesh>
    </group>
  )
}
