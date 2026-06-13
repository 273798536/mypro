import { useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Grid } from '@react-three/drei'
import { DisplayCaseMesh } from './DisplayCaseMesh'
import { LightPointMesh } from './LightPointMesh'
import { AxisHelper } from './AxisHelper'
import { useReviewStore } from '@/store/useReviewStore'

function SceneContent() {
  const displayCases = useReviewStore((s) => s.displayCases)
  const lightPoints = useReviewStore((s) => s.lightPoints)
  const selectedLightPointId = useReviewStore((s) => s.selectedLightPointId)
  const getFilteredLightPoints = useReviewStore((s) => s.getFilteredLightPoints)
  const currentStage = useReviewStore((s) => s.currentStage)
  const filterStatus = useReviewStore((s) => s.filterStatus)
  const filterGroup = useReviewStore((s) => s.filterGroup)
  const searchQuery = useReviewStore((s) => s.searchQuery)

  const filteredIds = useMemo(() => {
    const filtered = getFilteredLightPoints()
    return new Set(filtered.map((lp) => lp.id))
  }, [currentStage, filterStatus, filterGroup, searchQuery, getFilteredLightPoints])

  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 15, 10]}
        intensity={0.6}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
      />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={1} />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#0f172a" />
      </mesh>

      <Grid
        args={[50, 50]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e293b"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#334155"
        fadeDistance={50}
        followCamera={false}
        position={[0, 0.01, 0]}
      />

      {displayCases.map((dc) => (
        <DisplayCaseMesh key={dc.id} displayCase={dc} />
      ))}

      {lightPoints.map((lp) => (
        <LightPointMesh
          key={lp.id}
          lightPoint={lp}
          isSelected={selectedLightPointId === lp.id}
          isHovered={false}
          isFiltered={!filteredIds.has(lp.id)}
        />
      ))}

      <AxisHelper />

      <fog attach="fog" args={['#0f172a', 20, 60]} />
    </>
  )
}

export function Scene3D() {
  return (
    <Canvas
      shadows
      camera={{ position: [10, 8, 10], fov: 50 }}
      gl={{ antialias: true, alpha: false }}
      style={{ background: 'linear-gradient(to bottom, #0f172a 0%, #1e293b 100%)' }}
    >
      <SceneContent />
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2 - 0.1}
      />
    </Canvas>
  )
}
