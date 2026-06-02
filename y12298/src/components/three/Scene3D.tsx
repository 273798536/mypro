import { Canvas, useThree, useFrame, useThree as useThreeContext } from '@react-three/fiber'
import { OrbitControls, Grid, Html } from '@react-three/drei'
import { useAppStore } from '@/store/useAppStore'
import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import * as THREE from 'three'
import Lights from './Lights'
import Corridor from './Corridor'
import Valve from './Valve'
import RoutePath from './RoutePath'
import ForbiddenZone from './ForbiddenZone'
import Annotations3D from './Annotations3D'

export interface Scene3DHandle {
  getCanvas: () => HTMLCanvasElement | null
}

const Scene3DContent = forwardRef<Scene3DHandle>((_, ref) => {
  const { gl } = useThreeContext()

  useImperativeHandle(ref, () => ({
    getCanvas: () => gl.domElement,
  }))

  return <SceneContent />
})
Scene3DContent.displayName = 'Scene3DContent'

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

function CorridorNodes() {
  const corridor = useAppStore((s) => s.corridor)
  const isDrawingRoute = useAppStore((s) => s.isDrawingRoute)
  const addRoutePoint = useAppStore((s) => s.addRoutePoint)
  const draftRoutePoints = useAppStore((s) => s.draftRoutePoints)

  if (!isDrawingRoute) return null

  const selectedNodeIds = new Set(draftRoutePoints.map((p) => p.nodeId))

  return (
    <>
      {corridor.nodes.map((node) => {
        const isSelected = selectedNodeIds.has(node.id)
        return (
          <group key={node.id}>
            <mesh
              position={[node.position[0], node.position[1] + 0.3, node.position[2]]}
              onClick={(e) => {
                e.stopPropagation()
                addRoutePoint(node)
              }}
            >
              <sphereGeometry args={[isSelected ? 0.25 : 0.15, 16, 16]} />
              <meshBasicMaterial color={isSelected ? '#22C55E' : '#3B82F6'} transparent opacity={0.9} />
            </mesh>
            <Html
              position={[node.position[0], node.position[1] + 0.8, node.position[2]]}
              center
              zIndexRange={[100, 0]}
            >
              <div
                style={{
                  background: isSelected ? 'rgba(34,197,94,0.9)' : 'rgba(59,130,246,0.9)',
                  color: 'white',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontFamily: 'JetBrains Mono, monospace',
                  whiteSpace: 'nowrap',
                  pointerEvents: 'none',
                }}
              >
                {node.id} {isSelected && '✓'}
              </div>
            </Html>
          </group>
        )
      })}
    </>
  )
}

function DraftRoutePreview() {
  const draftRoutePoints = useAppStore((s) => s.draftRoutePoints)

  if (draftRoutePoints.length < 2) return null

  const points = draftRoutePoints.map(
    (p) => new THREE.Vector3(p.position[0], p.position[1] + 0.15, p.position[2]),
  )

  const pointsArray = new Float32Array(points.length * 3)
  points.forEach((p, i) => {
    pointsArray[i * 3] = p.x
    pointsArray[i * 3 + 1] = p.y
    pointsArray[i * 3 + 2] = p.z
  })

  return (
    <line>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" count={points.length} array={pointsArray} itemSize={3} />
      </bufferGeometry>
      <lineBasicMaterial color="#3B82F6" linewidth={3} />
    </line>
  )
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
  const isDrawingRoute = useAppStore((s) => s.isDrawingRoute)

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

      {showValveLayer && !isDrawingRoute && valves.map((valve) => (
        <Valve key={valve.id} valve={valve} showLabel={showAnnotationLayer} />
      ))}

      {showRouteLayer && visibleRoutes.map((route) => (
        <RoutePath key={route.id} route={route} showLabel={showAnnotationLayer} />
      ))}

      {showForbiddenZones && showForbiddenLayer &&
        forbiddenZones.map((zone) => (
          <ForbiddenZone key={zone.id} zone={zone} showLabel={showAnnotationLayer} />
        ))}

      {isDrawingRoute && (
        <>
          <CorridorNodes />
          <DraftRoutePreview />
        </>
      )}

      <Annotations3D />
    </>
  )
}

export interface Scene3DProps {
  onCanvasReady?: (canvas: HTMLCanvasElement) => void
}

export default function Scene3D({ onCanvasReady }: Scene3DProps) {
  const sceneRef = useRef<Scene3DHandle>(null)

  useEffect(() => {
    if (sceneRef.current && onCanvasReady) {
      const canvas = sceneRef.current.getCanvas()
      if (canvas) onCanvasReady(canvas)
    }
  }, [onCanvasReady])

  return (
    <div className="h-full w-full" style={{ border: '1px solid #1E3A5F' }}>
      <Canvas
        camera={{ position: [8, 6, 8], fov: 50, near: 0.1, far: 200 }}
        style={{ background: '#0A1628' }}
        gl={{ antialias: true, alpha: false, preserveDrawingBuffer: true }}
      >
        <color attach="background" args={['#0A1628']} />
        <CameraController />
        <Scene3DContent ref={sceneRef} />
      </Canvas>
    </div>
  )
}
