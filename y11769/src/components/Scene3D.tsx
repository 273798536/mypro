import React, { useRef, useMemo, useCallback, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Line, Edges, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useSandboxStore } from '@/store/useSandboxStore'

function AnimationLoop() {
  const isAnimating = useSandboxStore(s => s.isAnimating)
  const animationSpeed = useSandboxStore(s => s.animationSpeed)

  useFrame((_, delta) => {
    if (!isAnimating) return
    const state = useSandboxStore.getState()
    const next = state.animationTime + delta * animationSpeed
    state.setAnimationTime(next >= 60 ? 0 : next)
  })

  return null
}

function CameraSetup() {
  const { camera } = useThree()
  useMemo(() => {
    camera.position.set(0, 50, 150)
    camera.lookAt(0, 0, 0)
  }, [camera])
  return null
}

function GeologicalLayers() {
  const layers = useSandboxStore(s => s.layers)
  return (
    <>
      {layers.map(layer => {
        const thickness = layer.bottomDepth - layer.topDepth
        const y = -(layer.topDepth + thickness / 2)
        return (
          <mesh key={layer.id} position={[0, y, 0]}>
            <boxGeometry args={[400, thickness, 60]} />
            <meshStandardMaterial color={layer.color} transparent opacity={0.35} depthWrite={false} />
            <Edges color={layer.color} />
          </mesh>
        )
      })}
    </>
  )
}

function Epicenter({ onDragChange }: { onDragChange: (v: boolean) => void }) {
  const epicenter = useSandboxStore(s => s.epicenter)
  const setEpicenterPosition = useSandboxStore(s => s.setEpicenterPosition)
  const groupRef = useRef<THREE.Group>(null)
  const meshRef = useRef<THREE.Mesh>(null)
  const dragging = useRef(false)
  const hovered = useRef(false)
  const { gl, raycaster, pointer, camera } = useThree()
  const planeHelper = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), [])
  const hitPoint = useMemo(() => new THREE.Vector3(), [])

  useFrame((state) => {
    if (!groupRef.current || !meshRef.current) return
    if (dragging.current) {
      raycaster.setFromCamera(pointer, camera)
      if (raycaster.ray.intersectPlane(planeHelper, hitPoint)) {
        groupRef.current.position.y = hitPoint.y
      }
    } else {
      groupRef.current.position.set(...epicenter.position)
      const s = 1 + 0.2 * Math.sin(state.clock.elapsedTime * 3)
      meshRef.current.scale.set(s, s, s)
    }
    gl.domElement.style.cursor = (hovered.current || dragging.current) ? 'grab' : ''
  })

  const handlePointerDown = useCallback((e: THREE.Event) => {
    (e as any).stopPropagation()
    dragging.current = true
    onDragChange(true)
    gl.domElement.style.cursor = 'grabbing'
    const onUp = () => {
      if (groupRef.current) {
        setEpicenterPosition([epicenter.position[0], groupRef.current.position.y, epicenter.position[2]])
      }
      dragging.current = false
      onDragChange(false)
      gl.domElement.removeEventListener('pointerup', onUp)
    }
    gl.domElement.addEventListener('pointerup', onUp)
  }, [epicenter.position, setEpicenterPosition, gl.domElement, onDragChange])

  return (
    <group ref={groupRef} position={[...epicenter.position] as any}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerOver={() => { hovered.current = true }}
        onPointerOut={() => { hovered.current = false }}
      >
        <sphereGeometry args={[2, 32, 32]} />
        <meshStandardMaterial color="orange" emissive="orange" emissiveIntensity={2} />
      </mesh>
      <pointLight color="orange" intensity={2} distance={100} />
    </group>
  )
}

function Stations() {
  const stations = useSandboxStore(s => s.stations)
  const arrivals = useSandboxStore(s => s.arrivals)
  const setSelectedStation = useSandboxStore(s => s.setSelectedStation)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  return (
    <>
      {stations.map(station => {
        const sta = arrivals.filter(a => a.stationId === station.id)
        return (
          <group key={station.id} position={station.position as any}>
            <mesh
              onPointerOver={(e) => { e.stopPropagation(); setHoveredId(station.id) }}
              onPointerOut={() => setHoveredId(null)}
              onClick={() => setSelectedStation(station.id)}
            >
              <coneGeometry args={[1.5, 4, 8]} />
              <meshStandardMaterial color="green" />
            </mesh>
            {hoveredId === station.id && (
              <Html distanceFactor={80} position={[0, 5, 0]}>
                <div style={{
                  background: 'rgba(0,0,0,0.85)', color: '#fff', padding: '4px 8px',
                  borderRadius: 4, fontSize: 12, whiteSpace: 'nowrap', pointerEvents: 'none',
                }}>
                  <div>{station.label}</div>
                  {sta.map(a => (
                    <div key={a.waveType}>{a.waveType}: {a.time.toFixed(2)}s</div>
                  ))}
                </div>
              </Html>
            )}
          </group>
        )
      })}
    </>
  )
}

function RayPaths() {
  const rayPaths = useSandboxStore(s => s.rayPaths)
  const showRayPaths = useSandboxStore(s => s.showRayPaths)
  const showPWave = useSandboxStore(s => s.showPWave)
  const showSWave = useSandboxStore(s => s.showSWave)

  if (!showRayPaths) return null

  return (
    <>
      {rayPaths.map((rp, i) => {
        if (rp.waveType === 'P' && !showPWave) return null
        if (rp.waveType === 'S' && !showSWave) return null
        const color = rp.waveType === 'P' ? '#00e5ff' : '#ff4081'
        return rp.segments.map((seg, j) => (
          <Line key={`${i}-${j}`} points={[seg.start, seg.end]} color={color} lineWidth={1.5} />
        ))
      })}
    </>
  )
}

function Wavefronts() {
  const showWavefront = useSandboxStore(s => s.showWavefront)
  const isAnimating = useSandboxStore(s => s.isAnimating)
  const animationTime = useSandboxStore(s => s.animationTime)
  const showPWave = useSandboxStore(s => s.showPWave)
  const showSWave = useSandboxStore(s => s.showSWave)

  if (!showWavefront || !isAnimating) return null
  void animationTime

  const pPoints = useSandboxStore.getState().getWavefrontPoints('P')
  const sPoints = useSandboxStore.getState().getWavefrontPoints('S')

  return (
    <>
      {showPWave && pPoints.length > 1 && <Line points={pPoints} color="#00e5ff" lineWidth={2} />}
      {showSWave && sPoints.length > 1 && <Line points={sPoints} color="#ff4081" lineWidth={2} />}
    </>
  )
}

function Surface() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
      <planeGeometry args={[400, 60]} />
      <meshStandardMaterial color="darkgreen" transparent opacity={0.3} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
  )
}

export default function Scene3D() {
  const controlsRef = useRef<any>(null)
  const handleDragChange = useCallback((v: boolean) => {
    if (controlsRef.current) controlsRef.current.enabled = !v
  }, [])

  return (
    <>
      <CameraSetup />
      <ambientLight intensity={0.3} />
      <directionalLight position={[100, 100, 50]} intensity={0.8} />
      <OrbitControls
        ref={controlsRef}
        maxPolarAngle={Math.PI * 0.85}
        minDistance={20}
        maxDistance={500}
      />
      <GeologicalLayers />
      <Epicenter onDragChange={handleDragChange} />
      <Stations />
      <RayPaths />
      <Wavefronts />
      <Surface />
      <AnimationLoop />
      <EffectComposer>
        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} intensity={1.5} />
      </EffectComposer>
    </>
  )
}
