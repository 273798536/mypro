import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useStore } from '@/store/index'
import { MusicianMesh } from './MusicianMesh'
import { SoundCone } from './SoundCone'
import { MaterialBlock } from './MaterialBlock'
import { OcclusionLine } from './OcclusionLine'
import { useEffect } from 'react'
import { detectOcclusions } from '@/utils/occlusion'

function SceneContent() {
  const musicians = useStore((s) => s.musicians)
  const materials = useStore((s) => s.materials)
  const activeSections = useStore((s) => s.activeSections)
  const selectedMusicianId = useStore((s) => s.selectedMusicianId)
  const occlusions = useStore((s) => s.occlusions)
  const setOcclusions = useStore((s) => s.setOcclusions)

  const filteredMusicians = musicians.filter((m) =>
    activeSections.includes(m.section)
  )

  const visibleOcclusions = occlusions.filter((occ) => {
    if (occ.type === 'position_offset') return true
    const sourceVisible = filteredMusicians.some((m) => m.id === occ.sourceId)
    return sourceVisible
  })

  useEffect(() => {
    if (musicians.length > 0) {
      const result = detectOcclusions(musicians, materials)
      setOcclusions(result)
    }
  }, [musicians, materials, setOcclusions])

  return (
    <>
      <ambientLight intensity={0.3} color="#fff5e0" />
      <directionalLight
        position={[5, 15, 10]}
        intensity={0.7}
        color="#fff5e0"
        castShadow
      />
      <pointLight position={[0, 8, 0]} intensity={0.4} color="#d4a855" />

      <Grid
        args={[30, 30]}
        position={[0, -0.01, 0]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e2a42"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a3a5a"
        fadeDistance={30}
        fadeStrength={1}
        infiniteGrid
      />

      {filteredMusicians.map((m) => (
        <MusicianMesh key={m.id} musician={m} />
      ))}

      {filteredMusicians.map((m) => (
        <SoundCone
          key={`cone-${m.id}`}
          musician={m}
          visible={m.id === selectedMusicianId}
        />
      ))}

      {materials.map((mat) => (
        <MaterialBlock key={mat.id} material={mat} />
      ))}

      {visibleOcclusions.map((occ) => (
        <OcclusionLine
          key={occ.id}
          occlusion={occ}
          musicians={musicians}
          materials={materials}
        />
      ))}

      <OrbitControls
        makeDefault
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={40}
      />

      <fog attach="fog" args={['#0a0e1a', 20, 50]} />
    </>
  )
}

export function Stage() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{ position: [0, 12, 15], fov: 50, near: 0.1, far: 200 }}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        onPointerMissed={() => {
          useStore.getState().selectMusician(null)
          useStore.getState().selectMaterial(null)
        }}
      >
        <SceneContent />
      </Canvas>
    </div>
  )
}
