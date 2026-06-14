import { useEffect, useRef } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Environment } from '@react-three/drei'
import { EffectComposer, Bloom, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'
import GroundGrid from './GroundGrid'
import Walkway from './Walkway'
import WindPoints from './WindPoints'

function RendererBridge() {
  const { gl, scene, camera } = useThree()
  const setGlRenderer = useAppStore((s) => s.setGlRenderer)
  useEffect(() => {
    setGlRenderer({ gl, scene, camera, renderer: gl })
    return () => setGlRenderer(null)
  }, [gl, scene, camera, setGlRenderer])
  return null
}

function CameraController() {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null)
  const storeCamera = useAppStore((s) => s.camera)
  const setCamera = useAppStore((s) => s.setCamera)

  useEffect(() => {
    camera.position.set(...storeCamera.position)
    if (controlsRef.current) {
      controlsRef.current.target.set(...storeCamera.target)
      controlsRef.current.update()
    }
  }, [storeCamera, camera])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={3}
      maxDistance={150}
      maxPolarAngle={Math.PI / 2.1}
      onChange={() => {
        if (controlsRef.current) {
          const t = controlsRef.current.target
          setCamera({
            position: [camera.position.x, camera.position.y, camera.position.z],
            target: [t.x, t.y, t.z],
          })
        }
      }}
    />
  )
}

function SceneContent() {
  const selectPoint = useAppStore((s) => s.selectPoint)
  return (
    <>
      <RendererBridge />
      <CameraController />
      <ambientLight intensity={0.35} />
      <directionalLight position={[20, 40, 30]} intensity={0.7} color={0xffffff} />
      <directionalLight position={[-20, 20, -10]} intensity={0.3} color={0x1b9aaa} />
      <pointLight position={[0, 15, 40]} intensity={0.4} color={0x06d6a0} distance={60} />
      <fog attach="fog" args={[0x0a1d33, 40, 140]} />
      <Stars radius={200} depth={80} count={2000} factor={3} fade speed={0.3} />
      <GroundGrid />
      <Walkway />
      <WindPoints />
      <mesh
        position={[0, -50, 40]}
        onClick={(e) => {
          e.stopPropagation()
          selectPoint(null)
        }}
      >
        <sphereGeometry args={[300, 16, 16]} />
        <meshBasicMaterial color={0x0a1d33} side={THREE.BackSide} />
      </mesh>
      <EffectComposer multisampling={0} enableNormalPass={false}>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={0.8}
          mipmapBlur
        />
        <Noise opacity={0.03} />
      </EffectComposer>
    </>
  )
}

export default function Scene3D() {
  return (
    <Canvas
      camera={{ position: [30, 35, 60], fov: 55, near: 0.1, far: 500 }}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping }}
      dpr={[1, 2]}
      style={{ background: 'linear-gradient(180deg, #061220 0%, #0B2545 60%, #0a1d33 100%)' }}
    >
      <SceneContent />
    </Canvas>
  )
}
