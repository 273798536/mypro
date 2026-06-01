import { Canvas } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import Lights from './Lights'
import Corridor from './Corridor'
import Valve from './Valve'
import RoutePath from './RoutePath'
import ForbiddenZone from './ForbiddenZone'

export default function Scene3D() {
  const corridor = useAppStore((s) => s.corridor)
  const valves = useAppStore((s) => s.valves)
  const routes = useAppStore((s) => s.routes)
  const forbiddenZones = useAppStore((s) => s.forbiddenZones)
  const showFailedPaths = useAppStore((s) => s.showFailedPaths)
  const showForbiddenZones = useAppStore((s) => s.showForbiddenZones)

  const visibleRoutes = showFailedPaths
    ? routes
    : routes.filter((r) => r.status !== 'failed')

  return (
    <div className="h-full w-full">
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50, near: 0.1, far: 200 }}
        style={{ background: '#0A1628' }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0A1628']} />
        <OrbitControls makeDefault enableDamping dampingFactor={0.1} />
        <Lights />
        <Grid
          position={[0, -0.5, 0]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1E293B"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#1E293B"
          fadeDistance={50}
          infiniteGrid
        />
        <Corridor data={corridor} />

        {valves.map((valve) => (
          <Valve key={valve.id} valve={valve} />
        ))}

        {visibleRoutes.map((route) => (
          <RoutePath key={route.id} route={route} />
        ))}

        {showForbiddenZones &&
          forbiddenZones.map((zone) => (
            <ForbiddenZone key={zone.id} zone={zone} />
          ))}
      </Canvas>
    </div>
  )
}
