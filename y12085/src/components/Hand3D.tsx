import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Line } from '@react-three/drei'
import * as THREE from 'three'
import { FINGER_NAMES, BONE_CONNECTIONS } from '@/types'
import { usePlaybackStore } from '@/store/usePlaybackStore'

function useCurrentFrame() {
  const currentTimestamp = usePlaybackStore((s) => s.currentTimestamp)
  const currentPracticeId = usePlaybackStore((s) => s.currentPracticeId)
  const keypointFrames = usePlaybackStore((s) => s.keypointFrames)

  return useMemo(() => {
    const frames = keypointFrames.filter((f) => f.practiceId === currentPracticeId)
    if (frames.length === 0) return undefined
    let closest = frames[0]
    let minDiff = Math.abs(frames[0].timestamp - currentTimestamp)
    for (const f of frames) {
      const diff = Math.abs(f.timestamp - currentTimestamp)
      if (diff < minDiff) {
        minDiff = diff
        closest = f
      }
    }
    return closest
  }, [keypointFrames, currentPracticeId, currentTimestamp])
}

function KeypointSphere({ position, isMissing }: {
  position: [number, number, number]
  isMissing: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (meshRef.current && isMissing) {
      const t = state.clock.elapsedTime
      const scale = 1 + Math.sin(t * 4) * 0.5
      meshRef.current.scale.setScalar(scale)
    } else if (meshRef.current) {
      meshRef.current.scale.setScalar(1)
    }
  })

  const color = isMissing ? '#ff4757' : '#2ed573'
  const emissive = isMissing ? '#ff4757' : '#1a8a3e'
  const size = isMissing ? 0.018 : 0.012

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[size, 12, 12]} />
      <meshStandardMaterial
        color={color}
        emissive={emissive}
        emissiveIntensity={isMissing ? 0.8 : 0.2}
        transparent
        opacity={isMissing ? 0.9 : 1}
      />
    </mesh>
  )
}

function BoneLine({ start, end, isMissing }: {
  start: [number, number, number]
  end: [number, number, number]
  isMissing: boolean
}) {
  const points = useMemo(() => [
    new THREE.Vector3(...start),
    new THREE.Vector3(...end),
  ], [start, end])

  return (
    <Line
      points={points}
      color={isMissing ? '#ff4757' : '#ffffff'}
      lineWidth={isMissing ? 1.5 : 2}
      transparent
      opacity={isMissing ? 0.4 : 0.7}
    />
  )
}

function HandModel() {
  const currentFrame = useCurrentFrame()
  const keypoints = currentFrame?.keypoints ?? []
  const missingIndices = currentFrame?.missingIndices ?? []
  const missingSet = useMemo(() => new Set(missingIndices), [missingIndices])

  const safeKeypoints = useMemo(() => {
    if (keypoints.length === 21) return keypoints
    return Array.from({ length: 21 }, (_, i) => [0, i * 0.01, 0] as [number, number, number])
  }, [keypoints])

  const centerOffset = useMemo(() => {
    if (safeKeypoints.length === 0) return [0, 0, 0] as [number, number, number]
    const wrist = safeKeypoints[0]
    return [wrist[0], wrist[1], wrist[2]] as [number, number, number]
  }, [safeKeypoints])

  const centeredKeypoints = useMemo(() => {
    return safeKeypoints.map((p) => [
      p[0] - centerOffset[0],
      p[1] - centerOffset[1],
      p[2] - centerOffset[2],
    ] as [number, number, number])
  }, [safeKeypoints, centerOffset])

  return (
    <group rotation={[Math.PI * 0.8, 0, 0]} scale={[3, 3, 3]}>
      {centeredKeypoints.map((pos, i) => (
        <KeypointSphere
          key={i}
          position={pos}
          isMissing={missingSet.has(i)}
        />
      ))}
      {BONE_CONNECTIONS.map(([from, to], i) => {
        const isMissing = missingSet.has(from) || missingSet.has(to)
        return (
          <BoneLine
            key={i}
            start={centeredKeypoints[from]}
            end={centeredKeypoints[to]}
            isMissing={isMissing}
          />
        )
      })}
    </group>
  )
}

function MissingIndicator() {
  const currentFrame = useCurrentFrame()
  const missingIndices = currentFrame?.missingIndices ?? []
  const ref = useRef<THREE.Mesh>(null)

  useFrame((state) => {
    if (ref.current && missingIndices.length > 0) {
      const t = state.clock.elapsedTime
      ref.current.rotation.y = t * 0.5
    }
  })

  if (missingIndices.length === 0) return null

  return (
    <group position={[0, -1.5, 0]}>
      <mesh ref={ref}>
        <torusGeometry args={[0.15, 0.01, 8, 32]} />
        <meshStandardMaterial color="#ff4757" emissive="#ff4757" emissiveIntensity={0.5} transparent opacity={0.6} />
      </mesh>
    </group>
  )
}

function Scene() {
  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight position={[0, 5, 3]} intensity={0.8} />
      <HandModel />
      <MissingIndicator />
      <OrbitControls
        minDistance={1}
        maxDistance={10}
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
      />
    </>
  )
}

function KeypointTooltip() {
  const currentFrame = useCurrentFrame()
  const missingIndices = currentFrame?.missingIndices ?? []

  if (missingIndices.length === 0) return null

  return (
    <div className="absolute top-2 right-2 bg-[#ff4757]/15 border border-[#ff4757]/40 rounded px-2 py-1">
      <p className="text-[10px] text-[#ff4757] font-mono font-bold tracking-wide">
        丢失关键点
      </p>
      <p className="text-[9px] text-[#ff8a8a] font-mono mt-0.5">
        {missingIndices.map((i) => FINGER_NAMES[i]).join('、')}
      </p>
    </div>
  )
}

export default function Hand3D() {
  return (
    <div className="w-full h-full bg-[#0d0d1a] rounded-lg overflow-hidden relative">
      <Canvas
        camera={{ position: [0, 0, 2.5], fov: 50 }}
        gl={{ antialias: true, alpha: false }}
        style={{ background: '#0d0d1a' }}
      >
        <Scene />
      </Canvas>
      <KeypointTooltip />
    </div>
  )
}
