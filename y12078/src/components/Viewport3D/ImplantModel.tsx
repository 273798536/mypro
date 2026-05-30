import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'
import type { Implant, IssueType } from '@/types'

const ISSUE_COLORS: Record<IssueType, string> = {
  size_out_of_bound: '#FF7D00',
  side_mismatch: '#722ED1',
  forbidden_zone_collision: '#F53F3F',
}

function getImplantIssueType(implantId: string): IssueType | null {
  const issues = useAppStore.getState().issues
  const issue = issues.find((i) => i.implantId === implantId)
  return issue ? issue.type : null
}

export default function ImplantModel({ implant, isFiltered }: { implant: Implant; isFiltered: boolean }) {
  const meshRef = useRef<THREE.Group>(null)
  const selectedImplantId = useAppStore((s) => s.selectedImplantId)
  const selectImplant = useAppStore((s) => s.selectImplant)
  const renderMode = useAppStore((s) => s.renderMode)
  const showImplants = useAppStore((s) => s.showImplants)

  const isSelected = selectedImplantId === implant.id
  const issueType = getImplantIssueType(implant.id)

  useFrame((_, delta) => {
    if (meshRef.current && isSelected) {
      meshRef.current.position.y =
        implant.position[1] + Math.sin(Date.now() * 0.003) * 0.03
    }
  })

  if (!showImplants) return null

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation()
    selectImplant(isSelected ? null : implant.id)
  }

  const baseColor = issueType ? ISSUE_COLORS[issueType] : '#b0b8c8'
  const emissiveColor = issueType ? ISSUE_COLORS[issueType] : '#000000'
  const emissiveIntensity = issueType ? 0.3 : 0

  const materialProps = {
    solid: { color: baseColor, metalness: 0.8, roughness: 0.2, emissive: emissiveColor, emissiveIntensity, transparent: isFiltered, opacity: isFiltered ? 0.15 : 1 },
    wireframe: { color: baseColor, wireframe: true, transparent: true, opacity: isFiltered ? 0.1 : 0.7 },
    xray: { color: baseColor, transparent: true, opacity: isFiltered ? 0.05 : 0.4, emissive: emissiveColor, emissiveIntensity: emissiveIntensity * 2 },
  }

  const mat = materialProps[renderMode] as Record<string, unknown>

  const scale: [number, number, number] = [
    implant.width_mm / 14,
    implant.length_mm / 95,
    implant.thickness_mm / 5.2,
  ]

  return (
    <group
      ref={meshRef}
      position={implant.position}
      rotation={implant.rotation}
      onClick={handleClick}
    >
      <mesh castShadow scale={scale}>
        <boxGeometry args={[1, 4, 0.3]} />
        <meshStandardMaterial {...mat} />
      </mesh>
      {implant.modelNumber.includes('CCS') && (
        <mesh castShadow position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.15, 0.15, 3, 12]} />
          <meshStandardMaterial {...mat} />
        </mesh>
      )}
      {isSelected && (
        <mesh scale={[scale[0] * 1.3, scale[1] * 1.1, scale[2] * 2]}>
          <boxGeometry args={[1, 4, 0.3]} />
          <meshBasicMaterial color={baseColor} transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  )
}
