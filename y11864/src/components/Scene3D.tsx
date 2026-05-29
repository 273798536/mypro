import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import TrajectoryLine from './TrajectoryLine'
import GroundGrid from './GroundGrid'
import { useSimStore } from '@/store/useSimStore'

export default function Scene3D() {
  const trajectories = useSimStore(s => s.trajectories)
  const anomalyFilter = useSimStore(s => s.selectedAnomalyFilter)

  const visibleTrajectories = trajectories.filter(t => {
    if (anomalyFilter.size === 0) return true
    const hasFiltered = t.anomalies.some(a => anomalyFilter.has(a.type))
    return !hasFiltered
  })

  return (
    <div className="w-full h-full relative">
      <Canvas
        camera={{ position: [20, 15, 25], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
        style={{ background: '#0a0e17' }}
      >
        <ambientLight intensity={0.3} />
        <directionalLight position={[50, 50, 25]} intensity={0.8} />
        <pointLight position={[0, 30, 0]} intensity={0.4} color="#00d4ff" />

        <Stars radius={200} depth={100} count={3000} factor={4} saturation={0} fade speed={0.5} />

        <GroundGrid />

        {visibleTrajectories.map(traj => (
          <TrajectoryLine key={traj.id} result={traj} />
        ))}

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={200}
          maxPolarAngle={Math.PI / 2 - 0.05}
        />

        <EffectComposer>
          <Bloom luminanceThreshold={0.6} luminanceSmoothing={0.9} intensity={0.8} />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
