import { useMemo } from 'react'
import { useStore } from '@/store/index'
import type { AbsorptionMaterial } from '@/data/sampleData'

function getBlockColor(coefficients: Record<string, number>): string {
  const values = Object.values(coefficients)
  if (values.length === 0) return '#4fc3f7'
  const avg = values.reduce((a, b) => a + b, 0) / values.length
  const t = Math.min(Math.max(avg, 0), 1)
  const r = Math.round(79 + (102 - 79) * t)
  const g = Math.round(195 + (187 - 195) * t)
  const b = Math.round(247 + (106 - 247) * t)
  return `rgb(${r},${g},${b})`
}

interface MaterialBlockProps {
  material: AbsorptionMaterial
}

export function MaterialBlock({ material }: MaterialBlockProps) {
  const selectedMaterialId = useStore((s) => s.selectedMaterialId)
  const selectMaterial = useStore((s) => s.selectMaterial)
  const isSelected = material.id === selectedMaterialId

  const color = useMemo(
    () => getBlockColor(material.absorptionCoefficients),
    [material.absorptionCoefficients]
  )
  const hasMissing = material.missingFrequencies.length > 0
  const opacity = isSelected ? 0.7 : 0.4

  return (
    <group
      position={[material.position.x, material.position.y, material.position.z]}
      onClick={(e) => {
        e.stopPropagation()
        selectMaterial(material.id)
      }}
    >
      <mesh>
        <boxGeometry args={[material.size.width, material.size.height, material.size.depth]} />
        <meshStandardMaterial
          color={color}
          transparent
          opacity={opacity}
          depthWrite={false}
        />
      </mesh>
      {hasMissing && (
        <mesh>
          <boxGeometry args={[material.size.width, material.size.height, material.size.depth]} />
          <meshBasicMaterial color="#ff1744" wireframe transparent opacity={0.6} />
        </mesh>
      )}
    </group>
  )
}
