import { useMemo } from 'react'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { excavationZones } from '@/data/sampleData'

export default function ExcavationZone() {
  const showExcavation = useStore((s) => s.layerVisibility.excavation)
  const opacity = useStore((s) => s.layerOpacity.excavation)

  const zoneEdges = useMemo(() => {
    return excavationZones.map((zone) => ({
      id: zone.id,
      center: zone.center,
      size: zone.size,
      edges: new THREE.EdgesGeometry(new THREE.BoxGeometry(...zone.size)),
    }))
  }, [])

  if (!showExcavation) return null

  return (
    <group>
      {zoneEdges.map((z) => (
        <group key={z.id} position={z.center}>
          <mesh>
            <boxGeometry args={z.size} />
            <meshStandardMaterial
              color="#e74c3c"
              transparent
              opacity={opacity}
              side={THREE.DoubleSide}
              depthWrite={false}
            />
          </mesh>
          <lineSegments geometry={z.edges}>
            <lineBasicMaterial color="#e74c3c" transparent opacity={Math.min(opacity + 0.4, 1)} />
          </lineSegments>
        </group>
      ))}
    </group>
  )
}
