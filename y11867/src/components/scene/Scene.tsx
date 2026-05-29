import { useRef, Suspense, useEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls as DreiOrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import VoxelGrid from './VoxelGrid'
import BuildingBlocks from './BuildingBlocks'
import WindArrows from './WindArrows'
import RiskAnnotations from './RiskAnnotations'
import ColorLegend from './ColorLegend'

function CameraController() {
  const cameraTarget = useStore(state => state.cameraTarget)
  const setCameraTarget = useStore(state => state.setCameraTarget)
  const targetVec = useRef(new THREE.Vector3())
  const cameraPosTarget = useRef(new THREE.Vector3())
  const { camera, controls } = useThree()

  useFrame(() => {
    if (cameraTarget && controls) {
      const orbitControls = controls as unknown as { target: THREE.Vector3; update: () => void }
      targetVec.current.set(...cameraTarget)
      cameraPosTarget.current.set(
        cameraTarget[0] + 30,
        cameraTarget[1] + 30,
        cameraTarget[2] + 30
      )
      camera.position.lerp(cameraPosTarget.current, 0.05)
      orbitControls.target.lerp(targetVec.current, 0.05)
      orbitControls.update()
      if (camera.position.distanceTo(cameraPosTarget.current) < 0.5) {
        setCameraTarget(null)
      }
    }
  })

  return null
}

function SceneContent() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[50, 100, 50]} intensity={0.8} />
      <fog attach="fog" args={['#1a1a2e', 100, 400]} />
      <DreiOrbitControls
        makeDefault
        minDistance={20}
        maxDistance={500}
      />
      <VoxelGrid />
      <BuildingBlocks />
      <WindArrows />
      <RiskAnnotations />
      <Grid
        position={[0, 0, 0]}
        cellSize={5}
        cellThickness={0.5}
        cellColor="#444466"
        sectionSize={25}
        sectionThickness={1}
        sectionColor="#666688"
        fadeDistance={300}
        infiniteGrid
      />
      <axesHelper args={[30]} position={[-95, 0, -95]} />
      <CameraController />
    </>
  )
}

export default function Scene() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <Canvas
        camera={{ position: [80, 60, 80], fov: 50, near: 0.1, far: 1000 }}
        gl={{ antialias: true }}
        onPointerMissed={() => useStore.getState().selectVoxel(null)}
      >
        <Suspense fallback={null}>
          <SceneContent />
        </Suspense>
      </Canvas>
      <ColorLegend />
    </div>
  )
}
