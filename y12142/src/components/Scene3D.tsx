import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { useStore, cells as allCells } from '@/store/useStore'
import * as THREE from 'three'
import CabinetModel from './CabinetModel'

function SceneContent() {
  const filters = useStore((s) => s.filters)
  const selectedCellId = useStore((s) => s.selectedCellId)
  const setSelectedCellId = useStore((s) => s.setSelectedCellId)

  const cabinetIds = useMemo(() => {
    const ids = new Set(allCells.map((c) => c.cabinetId))
    return Array.from(ids)
  }, [])

  const filteredCells = useMemo(() => {
    let result = allCells
    if (filters.cabinetId) {
      result = result.filter((c) => c.cabinetId === filters.cabinetId)
    }
    if (filters.anomalyType) {
      result = result.filter((c) => c.status === filters.anomalyType)
    }
    return result
  }, [filters])

  const cellsByCabinet = useMemo(() => {
    const map: Record<string, typeof filteredCells> = {}
    for (const cell of filteredCells) {
      if (!map[cell.cabinetId]) map[cell.cabinetId] = []
      map[cell.cabinetId].push(cell)
    }
    return map
  }, [filteredCells])

  return (
    <>
      <ambientLight intensity={0.15} />
      <directionalLight position={[10, 15, 8]} intensity={0.6} color="#c8d6e5" />
      <directionalLight position={[-8, 10, -5]} intensity={0.2} color="#576574" />

      {cabinetIds.map((cabId, i) => (
        <CabinetModel
          key={cabId}
          cabinetId={cabId}
          cells={cellsByCabinet[cabId] || []}
          position={[(i - 0.5) * 4, 0, 0]}
          selectedCellId={selectedCellId}
          onSelectCell={setSelectedCellId}
        />
      ))}

      <OrbitControls
        makeDefault
        minDistance={3}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0.5, 0]}
      />
      <Environment preset="night" />
      <EffectComposer>
        <Bloom
          luminanceThreshold={0.6}
          luminanceSmoothing={0.4}
          intensity={0.8}
        />
      </EffectComposer>
    </>
  )
}

export default function Scene3D() {
  return (
    <div className="w-full h-full bg-[#0a0e14] rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [0, 4, 8], fov: 50 }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.2 }}
        dpr={[1, 2]}
      >
        <SceneContent />
      </Canvas>
    </div>
  )
}
