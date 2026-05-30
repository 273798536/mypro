import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'
import type { CTAnnotation } from '@/types'

const TYPE_COLORS: Record<CTAnnotation['type'], string> = {
  landmark: '#00B42A',
  tumor: '#FF7D00',
  nerve: '#722ED1',
  vessel: '#F53F3F',
  forbidden_zone: '#F53F3F',
}

export default function AnnotationPoints() {
  const annotations = useAppStore((s) => s.annotations)
  const showAnnotations = useAppStore((s) => s.showAnnotations)
  const selectedAnnotationId = useAppStore((s) => s.selectedAnnotationId)
  const selectAnnotation = useAppStore((s) => s.selectAnnotation)

  if (!showAnnotations) return null

  return (
    <group>
      {annotations.map((ann) => (
        <AnnotationSphere
          key={ann.id}
          annotation={ann}
          isSelected={selectedAnnotationId === ann.id}
          onSelect={() => selectAnnotation(ann.id === selectedAnnotationId ? null : ann.id)}
        />
      ))}
    </group>
  )
}

function AnnotationSphere({
  annotation,
  isSelected,
  onSelect,
}: {
  annotation: CTAnnotation
  isSelected: boolean
  onSelect: () => void
}) {
  const ref = useRef<THREE.Mesh>(null)
  const color = TYPE_COLORS[annotation.type]
  const isForbidden = annotation.type === 'forbidden_zone'
  const baseSize = annotation.radius_mm / 10

  useFrame(() => {
    if (ref.current && isSelected) {
      const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.15
      ref.current.scale.setScalar(pulse)
    }
  })

  const handleClick = (e: THREE.Event) => {
    (e as unknown as { stopPropagation: () => void }).stopPropagation()
    onSelect()
  }

  return (
    <group position={annotation.position}>
      <mesh ref={ref} onClick={handleClick}>
        {isForbidden ? (
          <sphereGeometry args={[baseSize, 24, 24]} />
        ) : (
          <sphereGeometry args={[0.06, 12, 12]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected ? 0.6 : 0.2}
          transparent
          opacity={isForbidden ? 0.18 : 0.85}
          roughness={0.4}
        />
      </mesh>
      {!isForbidden && (
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.025, 8, 8]} />
          <meshBasicMaterial color={color} />
        </mesh>
      )}
      {isSelected && isForbidden && (
        <mesh>
          <sphereGeometry args={[baseSize * 1.3, 24, 24]} />
          <meshBasicMaterial color={color} transparent opacity={0.06} />
        </mesh>
      )}
    </group>
  )
}
