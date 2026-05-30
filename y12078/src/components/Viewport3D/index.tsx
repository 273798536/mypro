import { useRef, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Grid, GizmoHelper, GizmoViewport } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'
import BoneModel from './BoneModel'
import ImplantModel from './ImplantModel'
import AnnotationPoints from './AnnotationPoints'
import CollisionHighlight from './CollisionHighlight'
import SceneLighting from './SceneLighting'

function CameraController() {
  const { camera } = useThree()
  const cameraTarget = useAppStore((s) => s.cameraTarget)
  const setCameraTarget = useAppStore((s) => s.setCameraTarget)
  const targetPos = useRef(new THREE.Vector3(5, 3, 8))
  const targetLook = useRef(new THREE.Vector3(0, 1.5, 0))

  useEffect(() => {
    if (cameraTarget) {
      targetPos.current.set(...cameraTarget.position)
      targetLook.current.set(...cameraTarget.target)
    }
  }, [cameraTarget])

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, delta * 2)
    const currentLook = new THREE.Vector3()
    camera.getWorldDirection(currentLook)
    const currentTarget = new THREE.Vector3().copy(camera.position).add(currentLook.multiplyScalar(5))
    currentTarget.lerp(targetLook.current, delta * 2)
    camera.lookAt(targetLook.current)
    if (cameraTarget && camera.position.distanceTo(targetPos.current) < 0.05) {
      setCameraTarget(null)
    }
  })

  return null
}

function SceneContent() {
  const implants = useAppStore((s) => s.implants)
  const filteredImplants = useAppStore((s) => s.filteredImplants)
  const filteredIds = new Set(filteredImplants.map((i) => i.id))

  return (
    <>
      <SceneLighting />
      <CameraController />
      <BoneModel />
      {filteredImplants.map((implant) => (
        <ImplantModel key={implant.id} implant={implant} isFiltered={false} />
      ))}
      {implants.filter((i) => !filteredIds.has(i.id)).map((implant) => (
        <ImplantModel key={implant.id} implant={implant} isFiltered={true} />
      ))}
      <AnnotationPoints />
      <CollisionHighlight />
      <Grid
        args={[20, 20]}
        position={[0, -1, 0]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#2a2f3b"
        sectionSize={2}
        sectionThickness={1}
        sectionColor="#3d4350"
        fadeDistance={15}
        fadeStrength={1}
        infiniteGrid
      />
      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.1}
        minDistance={2}
        maxDistance={20}
        target={[0, 1.5, 0]}
      />
      <GizmoHelper alignment="bottom-right" margin={[60, 60]}>
        <GizmoViewport labelColor="#c9cdd4" axisHeadScale={0.8} />
      </GizmoHelper>
    </>
  )
}

export default function Viewport3D() {
  return (
    <div className="w-full h-full bg-med-dark rounded-lg overflow-hidden border border-med-border/30">
      <Canvas
        camera={{ position: [5, 3, 8], fov: 50, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping
          gl.toneMappingExposure = 1.2
        }}
      >
        <color attach="background" args={['#141720']} />
        <fog attach="fog" args={['#141720', 12, 25]} />
        <SceneContent />
      </Canvas>
    </div>
  )
}
