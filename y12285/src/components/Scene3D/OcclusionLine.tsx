import { useMemo } from 'react'
import { Line } from '@react-three/drei'
import type { Musician, AbsorptionMaterial } from '@/data/sampleData'

interface OcclusionEvent {
  id: string
  sourceId: string
  targetId: string
  type: 'musician_block' | 'material_block' | 'position_offset'
  reason: string
  suggestion: string
  timestamp: number
}

interface OcclusionLineProps {
  occlusion: OcclusionEvent
  musicians: Musician[]
  materials: AbsorptionMaterial[]
}

export function OcclusionLine({ occlusion, musicians, materials }: OcclusionLineProps) {
  const points = useMemo(() => {
    const source = musicians.find((m) => m.id === occlusion.sourceId)
    if (!source) return null

    const sourcePos: [number, number, number] = [
      source.position.x,
      source.position.y + 0.6,
      source.position.z,
    ]

    if (occlusion.type === 'position_offset') {
      const zoneOffsets: Record<string, [number, number, number]> = {
        zone_strings: [-2, 0.6, -2],
        zone_woodwinds: [0, 0.6, 3.5],
        zone_brass: [3, 0.6, 4],
        zone_percussion: [5, 0.6, 6],
        zone_unassigned: [0, 0.6, 6],
      }
      const target = zoneOffsets[occlusion.targetId] ?? [0, 0.6, 6]
      return [sourcePos, target as [number, number, number]]
    }

    const targetMusician = musicians.find((m) => m.id === occlusion.targetId)
    if (targetMusician) {
      return [
        sourcePos,
        [targetMusician.position.x, targetMusician.position.y + 0.6, targetMusician.position.z] as [number, number, number],
      ]
    }

    const targetMaterial = materials.find((m) => m.id === occlusion.targetId)
    if (targetMaterial) {
      return [
        sourcePos,
        [targetMaterial.position.x, targetMaterial.position.y, targetMaterial.position.z] as [number, number, number],
      ]
    }

    return null
  }, [occlusion, musicians, materials])

  if (!points) return null

  return (
    <group>
      <Line
        points={points}
        color="#ff1744"
        lineWidth={1.5}
        dashed
        dashSize={0.3}
        gapSize={0.15}
      />
      <mesh position={points[0]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ff1744" />
      </mesh>
      <mesh position={points[1]}>
        <sphereGeometry args={[0.08, 8, 8]} />
        <meshBasicMaterial color="#ff1744" />
      </mesh>
    </group>
  )
}
