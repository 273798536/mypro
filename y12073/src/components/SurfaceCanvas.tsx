import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'
import { getSurfaceById } from '@/data/surfaces'
import { evaluateProtections, applyProtectionClamps } from '@/utils/protectionEngine'

const GRID_SIZE = 80
const SURFACE_SEGMENTS = 80

function ParametricSurface() {
  const meshRef = useRef<THREE.Mesh>(null)
  const activeSurfaceId = useStore(s => s.activeSurfaceId)
  const rawParams = useStore(s => s.params)
  const surface = getSurfaceById(activeSurfaceId)
  const addHistoryEntry = useStore(s => s.addHistoryEntry)
  const setParams = useStore(s => s.setParams)

  const safeParams = useMemo(() => {
    if (!surface) return rawParams
    return applyProtectionClamps(activeSurfaceId, rawParams)
  }, [rawParams, activeSurfaceId, surface])

  const { geometry, vertexColors } = useMemo(() => {
    if (!surface) {
      return { geometry: new THREE.BufferGeometry(), vertexColors: new Float32Array(0) }
    }

    const positions: number[] = []
    const colors: number[] = []
    const indices: number[] = []

    const safeMin = 0.01
    const eps = 1e-6
    const p = { ...safeParams }
    for (const key of Object.keys(p)) {
      p[key] = Math.max(safeMin, Math.abs(p[key]) < eps ? safeMin : p[key])
    }

    for (let i = 0; i <= SURFACE_SEGMENTS; i++) {
      for (let j = 0; j <= SURFACE_SEGMENTS; j++) {
        const u = surface.uRange[0] + (i / SURFACE_SEGMENTS) * (surface.uRange[1] - surface.uRange[0])
        const v = surface.vRange[0] + (j / SURFACE_SEGMENTS) * (surface.vRange[1] - surface.vRange[0])

        const [x, y, z] = surface.computeVertex(p, u, v)

        if (!isFinite(x) || !isFinite(y) || !isFinite(z)) {
          positions.push(0, 0, 0)
          colors.push(0.5, 0.5, 0.5)
        } else {
          positions.push(x, y, z)
          const mag = Math.sqrt(x * x + y * y + z * z)
          const normMag = Math.min(mag / 5, 1)
          const t = (z + 3) / 6
          colors.push(
            0.83 * (1 - t) + 0.18 * t,
            0.66 * (1 - t) + 0.45 * t,
            0.33 * (1 - t) + 0.74 * t
          )
        }
      }
    }

    for (let i = 0; i < SURFACE_SEGMENTS; i++) {
      for (let j = 0; j < SURFACE_SEGMENTS; j++) {
        const a = i * (SURFACE_SEGMENTS + 1) + j
        const b = a + 1
        const c = (i + 1) * (SURFACE_SEGMENTS + 1) + j
        const d = c + 1
        indices.push(a, c, b)
        indices.push(b, c, d)
      }
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    geo.setIndex(indices)
    geo.computeVertexNormals()

    return { geometry: geo, vertexColors: new Float32Array(colors) }
  }, [surface, safeParams])

  useMemo(() => {
    if (!surface) return
    const results = evaluateProtections(activeSurfaceId, safeParams)
    const triggered = results.filter(r => r.triggered).map(r => r.ruleId)
    const hasClamped = results.some(r => r.triggered && r.action === 'clamp')

    if (hasClamped) {
      setParams(safeParams)
    }

    addHistoryEntry({
      surfaceId: activeSurfaceId,
      params: { ...safeParams },
      protectionTriggers: triggered,
      crossSectionStatus: triggered.length > 0 ? 'broken' : 'normal',
    })
  }, [safeParams, activeSurfaceId, surface])

  useFrame(() => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.001
    }
  })

  if (!surface) return null

  return (
    <mesh ref={meshRef} geometry={geometry}>
      <meshStandardMaterial
        vertexColors
        side={THREE.DoubleSide}
        metalness={0.1}
        roughness={0.6}
        transparent
        opacity={0.92}
      />
    </mesh>
  )
}

function SceneLighting() {
  return (
    <>
      <ambientLight intensity={0.3} color="#1a1a2e" />
      <directionalLight
        position={[5, 8, 5]}
        intensity={1.0}
        color="#ffecd2"
        castShadow
      />
      <directionalLight
        position={[-3, 4, -5]}
        intensity={0.4}
        color="#a8c0ff"
      />
      <pointLight position={[0, -5, 0]} intensity={0.2} color="#d4a853" />
    </>
  )
}

export default function SurfaceCanvas() {
  return (
    <div className="w-full h-full bg-[#0a0a0f] rounded-lg overflow-hidden">
      <Canvas
        camera={{ position: [5, 4, 5], fov: 45, near: 0.1, far: 100 }}
        gl={{ antialias: true, alpha: false }}
        dpr={[1, 2]}
      >
        <color attach="background" args={['#0a0a0f']} />
        <fog attach="fog" args={['#0a0a0f', 15, 30]} />
        <SceneLighting />
        <ParametricSurface />
        <Grid
          args={[GRID_SIZE, GRID_SIZE]}
          cellSize={1}
          cellThickness={0.5}
          cellColor="#1a1a2e"
          sectionSize={5}
          sectionThickness={1}
          sectionColor="#2a2a4e"
          fadeDistance={20}
          fadeStrength={1.5}
          position={[0, -3, 0]}
        />
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={2}
          maxDistance={20}
        />
        <EffectComposer>
          <Bloom
            intensity={0.3}
            luminanceThreshold={0.6}
            luminanceSmoothing={0.9}
          />
        </EffectComposer>
      </Canvas>
    </div>
  )
}
