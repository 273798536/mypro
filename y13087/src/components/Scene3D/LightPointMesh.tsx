import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Mesh, SpotLight } from 'three'
import * as THREE from 'three'
import type { LightPoint } from '@/types'
import { STATUS_COLORS } from '@/types'
import { useReviewStore } from '@/store/useReviewStore'

interface LightPointProps {
  lightPoint: LightPoint
  isSelected: boolean
  isHovered: boolean
  isFiltered: boolean
}

export function LightPointMesh({
  lightPoint,
  isSelected,
  isHovered,
  isFiltered,
}: LightPointProps) {
  const meshRef = useRef<Mesh>(null)
  const lightRef = useRef<SpotLight>(null)
  const [hovered, setHovered] = useState(false)
  const selectLightPoint = useReviewStore((s) => s.selectLightPoint)
  const getAdjacentPairsByPoint = useReviewStore((s) => s.getAdjacentPairsByPoint)
  const hoveredAdjacentPairId = useReviewStore((s) => s.hoveredAdjacentPairId)

  const adjacentPairs = useMemo(
    () => getAdjacentPairsByPoint(lightPoint.id),
    [lightPoint.id, getAdjacentPairsByPoint]
  )

  const hasAdjacentIssue = adjacentPairs.length > 0

  const isAdjacentHovered = useMemo(() => {
    if (!hoveredAdjacentPairId) return false
    return adjacentPairs.some((ap) => ap.id === hoveredAdjacentPairId)
  }, [hoveredAdjacentPairId, adjacentPairs])

  const baseColor = STATUS_COLORS[lightPoint.status]
  const displayColor = isSelected ? '#FBBF24' : isAdjacentHovered ? '#EF4444' : baseColor

  const scale = isSelected || isHovered || hovered ? 1.3 : 1
  const opacity = isFiltered ? 0.3 : 1

  useFrame((state) => {
    if (meshRef.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.1
      meshRef.current.scale.setScalar(scale * pulse * 0.6)
    }
    if (lightRef.current) {
      const intensity = lightPoint.intensity * 0.001
      lightRef.current.intensity = intensity * (0.9 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1)
    }
  })

  const handleClick = (e: any) => {
    e.stopPropagation()
    selectLightPoint(lightPoint.id)
  }

  const handlePointerOver = (e: any) => {
    e.stopPropagation()
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = (e: any) => {
    e.stopPropagation()
    setHovered(false)
    document.body.style.cursor = 'default'
  }

  const targetY = 0.5
  const targetPosition = new THREE.Vector3(
    lightPoint.position.x,
    targetY,
    lightPoint.position.z
  )

  return (
    <group position={[lightPoint.position.x, lightPoint.position.y, lightPoint.position.z]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color={displayColor}
          emissive={displayColor}
          emissiveIntensity={isSelected || isAdjacentHovered ? 2 : 0.8}
          transparent
          opacity={opacity}
        />
      </mesh>

      <mesh position={[0, -0.8, 0]}>
        <cylinderGeometry args={[0.3, 0.5, 0.6, 16]} />
        <meshStandardMaterial
          color="#475569"
          metalness={0.8}
          roughness={0.2}
          transparent
          opacity={opacity}
        />
      </mesh>

      <spotLight
        ref={lightRef}
        position={[0, -0.5, 0]}
        angle={Math.PI / (180 / lightPoint.beamAngle)}
        penumbra={0.3}
        decay={1}
        distance={10}
        color={baseColor}
        target-position={targetPosition}
        castShadow
        shadow-mapSize-width={512}
        shadow-mapSize-height={512}
      />

      {isSelected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.8, 1, 64]} />
          <meshBasicMaterial color="#FBBF24" transparent opacity={0.8} side={THREE.DoubleSide} />
        </mesh>
      )}

      {hasAdjacentIssue && !isSelected && (
        <mesh position={[0.5, 0.5, 0]}>
          <sphereGeometry args={[0.2, 16, 16]} />
          <meshBasicMaterial color="#EF4444" />
        </mesh>
      )}
    </group>
  )
}
