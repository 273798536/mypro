import { useRef, useState, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Pipeline } from "@/types"
import { useStore } from "@/store/useStore"
import { CONFLICT_SEVERITY_COLORS } from "@/types"

interface PipelineMeshProps {
  pipeline: Pipeline
}

export default function PipelineMesh({ pipeline }: PipelineMeshProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [hovered, setHovered] = useState(false)

  const selectedPipelineId = useStore((s) => s.selectedPipelineId)
  const selectedConflictId = useStore((s) => s.selectedConflictId)
  const conflicts = useStore((s) => s.conflicts)
  const clippingPlane = useStore((s) => s.clippingPlane)
  const selectPipeline = useStore((s) => s.selectPipeline)

  const isSelected = selectedPipelineId === pipeline.id

  const involvedConflicts = useMemo(
    () => conflicts.filter((c) => c.involvedPipelines.includes(pipeline.id)),
    [conflicts, pipeline.id]
  )

  const isSelectedConflictInvolved = useMemo(
    () =>
      selectedConflictId !== null &&
      involvedConflicts.some((c) => c.id === selectedConflictId),
    [selectedConflictId, involvedConflicts]
  )

  const pulseColor = useMemo(() => {
    if (!isSelectedConflictInvolved || selectedConflictId === null) return null
    const conflict = conflicts.find((c) => c.id === selectedConflictId)
    if (!conflict) return null
    return CONFLICT_SEVERITY_COLORS[conflict.severity]
  }, [isSelectedConflictInvolved, selectedConflictId, conflicts])

  const clippingPlanes = useMemo(() => {
    if (!clippingPlane.enabled) return []
    const normals: Record<string, THREE.Vector3> = {
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 1, 0),
      z: new THREE.Vector3(0, 0, 1),
    }
    return [new THREE.Plane(normals[clippingPlane.direction], -clippingPlane.position)]
  }, [clippingPlane.enabled, clippingPlane.direction, clippingPlane.position])

  const radius = Math.max(pipeline.diameter / 2, 0.03)

  useFrame((state) => {
    if (!groupRef.current) return
    if (isSelectedConflictInvolved) {
      const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.5 + 0.5
      groupRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          child.material.emissiveIntensity = pulse * 0.8
        }
      })
    }
  })

  return (
    <group
      ref={groupRef}
      onClick={(e) => {
        e.stopPropagation()
        selectPipeline(pipeline.id)
      }}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        document.body.style.cursor = "pointer"
      }}
      onPointerOut={() => {
        setHovered(false)
        document.body.style.cursor = "auto"
      }}
      scale={hovered ? 1.05 : 1}
    >
      {pipeline.segments.map((segment) => {
        const start = new THREE.Vector3(...segment.startPoint)
        const end = new THREE.Vector3(...segment.endPoint)
        const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5)
        const direction = new THREE.Vector3().subVectors(end, start)
        const length = direction.length()
        direction.normalize()

        return (
          <SegmentTube
            key={segment.id}
            start={start}
            end={end}
            mid={mid}
            direction={direction}
            length={length}
            radius={radius}
            color={pipeline.color}
            isSelected={isSelected}
            pulseColor={pulseColor}
            clippingPlanes={clippingPlanes}
            isSelectedConflictInvolved={isSelectedConflictInvolved}
          />
        )
      })}
    </group>
  )
}

interface SegmentTubeProps {
  start: THREE.Vector3
  end: THREE.Vector3
  mid: THREE.Vector3
  direction: THREE.Vector3
  length: number
  radius: number
  color: string
  isSelected: boolean
  pulseColor: string | null
  clippingPlanes: THREE.Plane[]
  isSelectedConflictInvolved: boolean
}

function SegmentTube({
  start,
  end,
  mid,
  direction,
  length,
  radius,
  color,
  isSelected,
  pulseColor,
  clippingPlanes,
  isSelectedConflictInvolved,
}: SegmentTubeProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const geometry = useMemo(() => {
    const curve = new THREE.LineCurve3(start, end)
    return new THREE.TubeGeometry(curve, Math.max(Math.ceil(length * 4), 2), radius, 12, false)
  }, [start, end, length, radius])

  const quaternion = useMemo(() => {
    const q = new THREE.Quaternion()
    q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction)
    return q
  }, [direction])

  const emissiveColor = useMemo(() => {
    if (pulseColor) return new THREE.Color(pulseColor)
    if (isSelected) return new THREE.Color(color)
    return new THREE.Color(0x000000)
  }, [isSelected, pulseColor, color])

  const emissiveIntensity = isSelected && !isSelectedConflictInvolved ? 0.4 : 0

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      position={mid}
      quaternion={quaternion}
    >
      <meshStandardMaterial
        color={color}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        clippingPlanes={clippingPlanes}
        clipShadows
        roughness={0.4}
        metalness={0.3}
      />
    </mesh>
  )
}
