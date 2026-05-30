import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'
import type { IssueType } from '@/types'

const ISSUE_COLORS: Record<IssueType, string> = {
  size_out_of_bound: '#FF7D00',
  side_mismatch: '#722ED1',
  forbidden_zone_collision: '#F53F3F',
}

export default function CollisionHighlight() {
  const issues = useAppStore((s) => s.filteredIssues)
  const implants = useAppStore((s) => s.implants)
  const showImplants = useAppStore((s) => s.showImplants)

  if (!showImplants) return null

  return (
    <group>
      {issues.map((issue) => {
        const implant = implants.find((i) => i.id === issue.implantId)
        if (!implant) return null
        return (
          <HighlightBox
            key={issue.id}
            position={implant.position}
            color={ISSUE_COLORS[issue.type]}
            scale={[
              implant.width_mm / 14 * 1.5,
              implant.length_mm / 95 * 1.2,
              implant.thickness_mm / 5.2 * 3,
            ]}
          />
        )
      })}
    </group>
  )
}

function HighlightBox({
  position,
  color,
  scale,
}: {
  position: [number, number, number]
  color: string
  scale: [number, number, number]
}) {
  const ref = useRef<THREE.Mesh>(null)

  useFrame(() => {
    if (ref.current) {
      const pulse = 0.15 + Math.sin(Date.now() * 0.004) * 0.08
      const mat = ref.current.material as THREE.MeshBasicMaterial
      mat.opacity = pulse
    }
  })

  return (
    <mesh ref={ref} position={position} scale={scale}>
      <boxGeometry args={[1, 4, 0.3]} />
      <meshBasicMaterial color={color} transparent opacity={0.15} wireframe />
    </mesh>
  )
}
