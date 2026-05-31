import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import { useStore } from "@/store/useStore"
import { CONFLICT_SEVERITY_COLORS } from "@/types"

export default function ConflictHighlight() {
  const groupRef = useRef<THREE.Group>(null)
  const conflicts = useStore((s) => s.conflicts)
  const selectedConflictId = useStore((s) => s.selectedConflictId)
  const filter = useStore((s) => s.filter)
  const getFilteredPipelines = useStore((s) => s.getFilteredPipelines)

  const visibleConflicts = useMemo(() => {
    if (!filter.showConflictsOnly && selectedConflictId === null) {
      return conflicts.filter((c) => c.status !== "resolved")
    }
    if (selectedConflictId) {
      return conflicts.filter((c) => c.id === selectedConflictId)
    }
    const filtered = getFilteredPipelines()
    const filteredIds = new Set(filtered.map((p) => p.id))
    return conflicts.filter((c) => c.involvedPipelines.some((id) => filteredIds.has(id)))
  }, [conflicts, selectedConflictId, filter.showConflictsOnly, getFilteredPipelines])

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.elapsedTime

    groupRef.current.children.forEach((child, i) => {
      if (child instanceof THREE.Mesh) {
        const pulse = Math.sin(time * 2 + i) * 0.5 + 0.5
        child.scale.setScalar(1 + pulse * 0.15)
        const mat = child.material as THREE.MeshBasicMaterial
        if (mat) {
          mat.opacity = 0.3 + pulse * 0.4
        }
      }
    })
  })

  return (
    <group ref={groupRef}>
      {visibleConflicts.map((conflict) => {
        const color = CONFLICT_SEVERITY_COLORS[conflict.severity]
        const isSelected = selectedConflictId === conflict.id

        return (
          <group key={conflict.id} position={conflict.location}>
            <mesh>
              <boxGeometry args={isSelected ? [1.2, 0.8, 1.2] : [0.8, 0.6, 0.8]} />
              <meshBasicMaterial
                color={color}
                transparent
                opacity={0.4}
                depthWrite={false}
              />
            </mesh>

            <lineSegments>
              <edgesGeometry
                args={[
                  new THREE.BoxGeometry(
                    isSelected ? 1.2 : 0.8,
                    isSelected ? 0.8 : 0.6,
                    isSelected ? 1.2 : 0.8
                  ),
                ]}
              />
              <lineBasicMaterial color={color} linewidth={2} />
            </lineSegments>

            <mesh position={[0, isSelected ? 0.6 : 0.45, 0]}>
              <coneGeometry args={[0.1, 0.3, 4]} />
              <meshBasicMaterial color={color} transparent opacity={0.8} />
            </mesh>

            {isSelected && (
              <>
                <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.5, 0.55, 32]} />
                  <meshBasicMaterial color={color} transparent opacity={0.6} />
                </mesh>
                <mesh position={[0, 0.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[0.7, 0.75, 32]} />
                  <meshBasicMaterial color={color} transparent opacity={0.3} />
                </mesh>
              </>
            )}
          </group>
        )
      })}
    </group>
  )
}
