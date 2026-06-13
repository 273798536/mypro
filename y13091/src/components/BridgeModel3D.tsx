import { useRef, useMemo, useEffect } from "react"
import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { OrbitControls, Line } from "@react-three/drei"
import { EffectComposer, Bloom } from "@react-three/postprocessing"
import * as THREE from "three"
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib"
import { useAppStore } from "@/store/useAppStore"

function CameraController() {
  const { records, selectedRecordId } = useAppStore()
  const { camera } = useThree()
  const controlsRef = useRef<OrbitControlsImpl | null>(null)
  const targetPos = useRef(new THREE.Vector3(12, 8, 12))
  const targetLookAt = useRef(new THREE.Vector3(0, 0, 0))

  useEffect(() => {
    if (selectedRecordId) {
      const record = records.find((r) => r.id === selectedRecordId)
      if (record) {
        const { x, y, z } = record.position3D
        targetLookAt.current.set(x, y, z)
        targetPos.current.set(x + 8, y + 6, z + 8)
      }
    } else {
      targetPos.current.set(12, 8, 12)
      targetLookAt.current.set(0, 0, 0)
    }
  }, [selectedRecordId, records])

  useFrame((_, delta) => {
    camera.position.lerp(targetPos.current, delta * 3)
    if (controlsRef.current) {
      controlsRef.current.target.lerp(targetLookAt.current, delta * 3)
    }
  })

  return <OrbitControls ref={controlsRef} enablePan enableZoom enableRotate minDistance={5} maxDistance={40} />
}

function SensorMarker({
  position,
  isActive,
  color,
}: {
  position: [number, number, number]
  isActive: boolean
  color: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)

  useFrame((_, delta) => {
    if (isActive && meshRef.current) {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.3)
    }
    if (ringRef.current) {
      const s = isActive ? 1.5 + Math.sin(Date.now() * 0.003) * 0.5 : 0.8
      ringRef.current.scale.setScalar(s)
      ringRef.current.rotation.z += delta * (isActive ? 2 : 0.5)
    }
  })

  return (
    <group position={position}>
      <mesh ref={meshRef}>
        <sphereGeometry args={[isActive ? 0.28 : 0.18, 16, 16]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isActive ? 2.5 : 0.4}
          transparent
          opacity={isActive ? 1 : 0.6}
        />
      </mesh>
      <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.35, 0.42, 32]} />
        <meshBasicMaterial
          color={color}
          transparent
          opacity={isActive ? 0.9 : 0.2}
          side={THREE.DoubleSide}
        />
      </mesh>
      {isActive && (
        <pointLight color={color} intensity={4} distance={6} />
      )}
    </group>
  )
}

function BridgeStructure() {
  const archPoints = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * 20 - 10
      const y = -2 + Math.cos((x / 10) * Math.PI) * 3
      pts.push([x, y, 0])
    }
    return pts
  }, [])

  const deckPoints = useMemo(() => {
    const pts: [number, number, number][] = []
    for (let i = 0; i <= 20; i++) {
      const x = (i / 20) * 20 - 10
      pts.push([x, 0, 0])
    }
    return pts
  }, [])

  const pillarPositions = useMemo(() => [-6, -2, 2, 6], [])

  return (
    <group>
      <Line
        points={archPoints}
        color="#2a3a4d"
        lineWidth={2}
        transparent
        opacity={0.6}
      />
      <Line
        points={deckPoints}
        color="#2a3a4d"
        lineWidth={3}
        transparent
        opacity={0.8}
      />
      <Line
        points={deckPoints.map((p) => [p[0], p[1], 4] as [number, number, number])}
        color="#2a3a4d"
        lineWidth={2}
        transparent
        opacity={0.5}
      />
      <Line
        points={deckPoints.map((p) => [p[0], p[1], -4] as [number, number, number])}
        color="#2a3a4d"
        lineWidth={2}
        transparent
        opacity={0.5}
      />
      {pillarPositions.map((x, i) => (
        <group key={i}>
          <Line
            points={[[x, -4, -4], [x, 0, -4]] as [number, number, number][]}
            color="#2a3a4d"
            lineWidth={1}
            transparent
            opacity={0.4}
          />
          <Line
            points={[[x, -4, 4], [x, 0, 4]] as [number, number, number][]}
            color="#2a3a4d"
            lineWidth={1}
            transparent
            opacity={0.4}
          />
          <Line
            points={[[x, 0, -4], [x, 0, 4]] as [number, number, number][]}
            color="#2a3a4d"
            lineWidth={1.5}
            transparent
            opacity={0.6}
          />
        </group>
      ))}

      <mesh position={[0, -4.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 12]} />
        <meshBasicMaterial color="#0b1019" transparent opacity={0.5} />
      </mesh>

      <mesh position={[0, -4.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[24, 12]} />
        <meshBasicMaterial color="#0f1724" transparent opacity={0.3} wireframe />
      </mesh>
    </group>
  )
}

function Scene() {
  const { records, selectedRecordId } = useAppStore()

  const statusColorMap: Record<string, string> = {
    processed: "#00e5a0",
    pending_material: "#f59e0b",
    manual_judgment: "#a855f7",
  }

  return (
    <>
      <ambientLight intensity={0.18} color="#4a6fa5" />
      <directionalLight position={[0, 8, 5]} intensity={0.45} color="#c8d8e8" />
      <directionalLight position={[0, -3, 0]} intensity={0.2} color="#ff8844" />

      <BridgeStructure />

      {records.map((r) => {
        const isActive = selectedRecordId === r.id
        const color = statusColorMap[r.status] || "#00e5a0"
        return (
          <SensorMarker
            key={r.id}
            position={[r.position3D.x, r.position3D.y, r.position3D.z]}
            isActive={isActive}
            color={color}
          />
        )
      })}

      <CameraController />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.15}
          luminanceSmoothing={0.85}
          intensity={1.5}
        />
      </EffectComposer>
    </>
  )
}

export default function BridgeModel3D() {
  return (
    <div className="h-72 bg-[#0b1019] border-b border-[#1e2d3d] relative overflow-hidden">
      <Canvas
        camera={{ position: [12, 8, 12], fov: 50 }}
        gl={{ antialias: true }}
        dpr={[1, 2]}
      >
        <Scene />
      </Canvas>
      <div className="absolute top-3 left-4 text-xs text-[#475569] pointer-events-none">
        3D桥隧模型 · 拖拽旋转 · 滚轮缩放
      </div>
      <div className="absolute top-3 right-4 flex gap-3 text-[10px] pointer-events-none">
        <span className="flex items-center gap-1 text-[#00e5a0]">
          <span className="w-2 h-2 rounded-full bg-[#00e5a0]" />
          已处理
        </span>
        <span className="flex items-center gap-1 text-[#f59e0b]">
          <span className="w-2 h-2 rounded-full bg-[#f59e0b]" />
          待补材料
        </span>
        <span className="flex items-center gap-1 text-[#a855f7]">
          <span className="w-2 h-2 rounded-full bg-[#a855f7]" />
          人工改判
        </span>
      </div>
    </div>
  )
}
