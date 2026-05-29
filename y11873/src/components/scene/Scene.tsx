import { useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useStore } from '@/store/useStore'
import TerrainMesh from './TerrainMesh'
import WarehouseMarker from './WarehouseMarker'
import RoadNetwork from './RoadNetwork'
import ServiceRadius from './ServiceRadius'

export default function Scene() {
  const warehouses = useStore(s => s.warehouses)
  const roads = useStore(s => s.roads)
  const filters = useStore(s => s.filters)
  const setSelectedWarehouse = useStore(s => s.setSelectedWarehouse)
  const setSelectedRoad = useStore(s => s.setSelectedRoad)

  const filteredWarehouses = warehouses.filter(w => {
    if (filters.warehouseStatuses.length > 0 && !filters.warehouseStatuses.includes(w.status)) return false
    if (filters.supplyTypes.length > 0 && !w.supplies.some(s => filters.supplyTypes.includes(s.type))) return false
    return true
  })

  const filteredRoads = roads.filter(r =>
    filters.roadStatuses.length === 0 || filters.roadStatuses.includes(r.status)
  )

  const handlePointerMissed = useCallback(() => {
    setSelectedWarehouse(null)
    setSelectedRoad(null)
  }, [setSelectedWarehouse, setSelectedRoad])

  return (
    <Canvas
      camera={{ position: [25, 20, 25], fov: 50, near: 0.1, far: 200 }}
      shadows
      onPointerMissed={handlePointerMissed}
      gl={{ antialias: true }}
    >
      <fog attach="fog" args={['#0a0e1a', 30, 80]} />

      <ambientLight intensity={0.4} color="#b0c4de" />
      <directionalLight
        intensity={0.8}
        position={[10, 15, 5]}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />

      <OrbitControls
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={60}
        target={[0, 0, 0]}
      />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <TerrainMesh />

      {filteredWarehouses.map(w => (
        <WarehouseMarker key={w.id} warehouse={w} />
      ))}

      <RoadNetwork roads={filteredRoads} />

      {filteredWarehouses.map(w => (
        <ServiceRadius key={`sr-${w.id}`} warehouse={w} />
      ))}

      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.6} luminanceSmoothing={0.9} />
      </EffectComposer>
    </Canvas>
  )
}
