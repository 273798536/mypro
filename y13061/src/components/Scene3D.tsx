import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid, Stars } from '@react-three/drei'
import { EffectComposer, Vignette, Bloom, Noise } from '@react-three/postprocessing'
import MonitoringWell3D from './MonitoringWell3D'
import { monitoringWells, getSnapshot, findTimePoint } from '@/data/mockData'
import { useAppStore } from '@/store/useAppStore'

export default function Scene3D() {
  const currentTimePointId = useAppStore((s) => s.currentTimePointId)
  const selectWell = useAppStore((s) => s.selectWell)
  const tp = findTimePoint(currentTimePointId)

  return (
    <Canvas
      camera={{ position: [6, 6.5, 9], fov: 45 }}
      shadows
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true }}
      onPointerMissed={() => selectWell(null)}
    >
      <color attach="background" args={['#070b10']} />
      <fog attach="fog" args={['#070b10', 12, 28]} />

      <ambientLight intensity={0.35} color="#475569" />
      <directionalLight
        position={[5, 9, 4]}
        intensity={0.75}
        color="#cbd5e1"
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />
      <pointLight position={[-4, 3, -2]} intensity={0.6} color="#2dd4bf" distance={14} />
      <pointLight position={[4, 2, -4]} intensity={0.55} color="#f59e0b" distance={12} />
      <pointLight position={[0, 4, 4]} intensity={0.4} color="#ef4444" distance={10} />

      <Stars radius={60} depth={40} count={1200} factor={3} fade speed={0.4} />

      <Grid
        position={[0, -1, 0]}
        args={[24, 24]}
        cellSize={1}
        cellThickness={0.4}
        cellColor="#1a2230"
        sectionSize={4}
        sectionThickness={0.8}
        sectionColor="#2dd4bf"
        fadeDistance={22}
        fadeStrength={1.2}
        infiniteGrid
      />

      <mesh position={[0, -1.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a0e13" metalness={0.1} roughness={0.95} />
      </mesh>

      {monitoringWells.map((well) => (
        <MonitoringWell3D
          key={well.id}
          well={well}
          snapshot={getSnapshot(well.id, currentTimePointId)}
        />
      ))}

      <OrbitControls
        enablePan
        enableZoom
        enableRotate
        minDistance={4}
        maxDistance={22}
        maxPolarAngle={Math.PI / 2.05}
        target={[0, 0, 0]}
      />

      <EffectComposer multisampling={0}>
        <Bloom luminanceThreshold={0.35} luminanceSmoothing={0.9} intensity={0.7} mipmapBlur />
        <Noise opacity={0.045} />
        <Vignette eskil={false} offset={0.25} darkness={0.85} />
      </EffectComposer>
    </Canvas>
  )
}
