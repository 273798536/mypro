import { useRef, useMemo, useCallback } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, PerspectiveCamera, Environment, Grid } from "@react-three/drei"
import { EffectComposer, Bloom, Selection, Select } from "@react-three/postprocessing"
import * as THREE from "three"
import PipelineMesh from "./PipelineMesh"
import ClippingPlaneVisual from "./ClippingPlaneVisual"
import ConflictHighlight from "./ConflictHighlight"
import { useStore } from "@/store/useStore"

function FocusController() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const selectedConflictId = useStore((s) => s.selectedConflictId)
  const selectedPipelineId = useStore((s) => s.selectedPipelineId)
  const getConflictById = useStore((s) => s.getConflictById)
  const getPipelineById = useStore((s) => s.getPipelineById)
  const targetRef = useRef(new THREE.Vector3())
  const animatingRef = useRef(false)
  const animationStartRef = useRef<THREE.Vector3 | null>(null)
  const animationTargetRef = useRef<THREE.Vector3 | null>(null)
  const cameraStartRef = useRef<THREE.Vector3 | null>(null)
  const cameraTargetRef = useRef<THREE.Vector3 | null>(null)

  const focusLocation = useCallback((location: [number, number, number]) => {
    const [x, y, z] = location
    const target = new THREE.Vector3(x, y, z)
    const cameraOffset = new THREE.Vector3(8, 6, 8)
    const cameraPos = target.clone().add(cameraOffset)

    animationStartRef.current = targetRef.current.clone()
    animationTargetRef.current = target
    cameraStartRef.current = camera.position.clone()
    cameraTargetRef.current = cameraPos
    animatingRef.current = true
  }, [])

  useMemo(() => {
    if (selectedConflictId) {
      const conflict = getConflictById(selectedConflictId)
      if (conflict) {
        focusLocation(conflict.location)
      }
    } else if (selectedPipelineId) {
      const pipeline = getPipelineById(selectedPipelineId)
      if (pipeline && pipeline.segments.length > 0) {
        const seg = pipeline.segments[0]
        const midX = (seg.startPoint[0] + seg.endPoint[0]) / 2
        const midY = (seg.startPoint[1] + seg.endPoint[1]) / 2
        const midZ = (seg.startPoint[2] + seg.endPoint[2]) / 2
        focusLocation([midX, midY, midZ])
      }
    }
  }, [selectedConflictId, selectedPipelineId, getConflictById, getPipelineById, focusLocation])

  useFrame((state, delta) => {
    if (animatingRef.current && animationTargetRef.current && cameraTargetRef.current) {
      const progress = Math.min(delta * 3, 1)

      if (animationStartRef.current && animationTargetRef.current) {
        targetRef.current.lerpVectors(animationStartRef.current, animationTargetRef.current, progress)
      }
      if (cameraStartRef.current && cameraTargetRef.current) {
        camera.position.lerpVectors(cameraStartRef.current, cameraTargetRef.current, progress)
      }

      if (controlsRef.current) {
        controlsRef.current.target.copy(targetRef.current)
        controlsRef.current.update()
      }

      const dist = camera.position.distanceTo(cameraTargetRef.current)
      if (dist < 0.1) {
        animatingRef.current = false
      }
    }
  })

  return <OrbitControls ref={controlsRef} makeDefault enableDamping dampingFactor={0.05} minDistance={3} maxDistance={30} />
}

function SceneContent() {
  const getFilteredPipelines = useStore((s) => s.getFilteredPipelines)
  const selectedPipelineId = useStore((s) => s.selectedPipelineId)
  const selectedConflictId = useStore((s) => s.selectedConflictId)
  const clippingPlane = useStore((s) => s.clippingPlane)
  const pipelines = getFilteredPipelines()

  const clipperPlanes = useMemo(() => {
    if (!clippingPlane.enabled) return []
    const normals: Record<string, THREE.Vector3> = {
      x: new THREE.Vector3(1, 0, 0),
      y: new THREE.Vector3(0, 1, 0),
      z: new THREE.Vector3(0, 0, 1),
    }
    return [new THREE.Plane(normals[clippingPlane.direction], -clippingPlane.position)]
  }, [clippingPlane.enabled, clippingPlane.direction, clippingPlane.position])

  const gl = useThree((state) => state.gl)
  useMemo(() => {
    gl.localClippingEnabled = clippingPlane.enabled
  }, [gl, clippingPlane.enabled])

  return (
    <>
      <PerspectiveCamera makeDefault position={[10, 8, 10]} fov={50} />
      <FocusController />

      <color attach="background" args={["#0f1115"]} />
      <fog attach="fog" args={["#0f1115", 15, 40]} />

      <ambientLight intensity={0.3} />
      <directionalLight position={[5, 10, 5]} intensity={0.8} castShadow>
        <orthographicCamera attach="shadow-camera" args={[-15, 15, 15, -15]} />
      </directionalLight>
      <directionalLight position={[-5, 3, -5]} intensity={0.3} />
      <pointLight position={[0, -1, 0]} intensity={0.5} color="#4ecdc4" />

      <Environment preset="city" />

      <Grid
        position={[0, -3, 0]}
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#1e2028"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#2a2d36"
        fadeDistance={30}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[30, 30]} />
        <meshStandardMaterial color="#1a1d23" roughness={0.8} metalness={0.1} />
      </mesh>

      <Selection>
        <EffectComposer enableNormalPass={false}>
          <Bloom
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            height={300}
            intensity={1.5}
          />
        </EffectComposer>

        {pipelines.map((pipeline) => (
          <Select key={pipeline.id} enabled={selectedPipelineId === pipeline.id}>
            <PipelineMesh pipeline={pipeline} />
          </Select>
        ))}
      </Selection>

      <ConflictHighlight />
      <ClippingPlaneVisual />
    </>
  )
}

interface Scene3DProps {
  onReady?: (canvas: HTMLCanvasElement | null) => void
}

export default function Scene3D({ onReady }: Scene3DProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
        onReady?.(gl.domElement)
      }}
    >
      <SceneContent />
    </Canvas>
  )
}
