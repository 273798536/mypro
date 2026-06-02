import { Canvas, useThree, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { useRef, useEffect } from 'react'
import * as THREE from 'three'
import Lights from './Lights'
import Corridor from './Corridor'
import Valve from './Valve'
import RoutePath from './RoutePath'
import ForbiddenZone from './ForbiddenZone'

function CameraController() {
  const viewMode = useAppStore((s) => s.viewMode)
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const targetPos = useRef(new THREE.Vector3(8, 6, 8))
  const targetTarget = useRef(new THREE.Vector3(6, 0, 0))

  useEffect(() => {
    switch (viewMode) {
      case 'top':
        targetPos.current.set(6, 25, 0)
        targetTarget.current.set(6, 0, 0)
        break
      case 'side':
        targetPos.current.set(-15, 8, 0)
        targetTarget.current.set(6, 0, 0)
        break
      case 'free':
      default:
        targetPos.current.set(8, 6, 8)
        targetTarget.current.set(6, 0, 0)
        break
    }
  }, [viewMode])

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, delta * 5)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetTarget.current, delta * 5)
    }
  })

  return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.1} />
}

function SceneContent() {
  const corridor = useAppStore((s) => s.corridor)
  const valves = useAppStore((s) => s.valves)
  const routes = useAppStore((s) => s.routes)
  const forbiddenZones = useAppStore((s) => s.forbiddenZones)
  const showFailedPaths = useAppStore((s) => s.showFailedPaths)
  const showForbiddenZones = useAppStore((s) => s.showForbiddenZones)
  const showValveLayer = useAppStore((s) => s.showValveLayer)
  const showRouteLayer = useAppStore((s) => s.showRouteLayer)
  const showForbiddenLayer = useAppStore((s) => s.showForbiddenLayer)
  const showAnnotationLayer = useAppStore((s) => s.showAnnotationLayer)

  const visibleRoutes = showFailedPaths
    ? routes
    : routes.filter((r) => r.status !== 'failed')

  return (
    <>
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

      {showValveLayer && valves.map((valve) => (
        <Valve key={valve.id} valve={valve} showLabel={showAnnotationLayer} />
      ))}

      {showRouteLayer && visibleRoutes.map((route) => (
        <RoutePath key={route.id} route={route} showLabel={showAnnotationLayer} />
      ))}

      {showForbiddenZones && showForbiddenLayer &&
        forbiddenZones.map((zone) => (
          <ForbiddenZone key={zone.id} zone={zone} showLabel={showAnnotationLayer} />
        ))}
    </>
  )
}

export default function Scene3D() {
  return (
    <div className="h-full w-full" style={{ border: '1px solid #1E3A5F' }}>
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50, near: 0.1, far: 200 }}
        style={{ background: '#0A1628' }}
        gl={{ antialias: true, alpha: false }}
      >
        <color attach="background" args={['#0A1628']} />
        <CameraController />
        <SceneContent />
      </Canvas>
    </div>
  )
}
