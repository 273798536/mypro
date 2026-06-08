import { useMemo, useRef } from "react"
import { Canvas, useFrame } from "@react-three/fiber"
import { OrbitControls, Grid, Html, Line } from "@react-three/drei"
import * as THREE from "three"
import type { CrackParams, MaterialSource } from "@/types"
import { toMm } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface BridgePointCloudProps {
  params: CrackParams
  originalParams?: CrackParams
  materials: MaterialSource[]
  compareMode: "single" | "before" | "after" | "split"
  onMaterialClick?: (materialId: string) => void
}

function generateBridgePoints(count = 6000) {
  const positions = new Float32Array(count * 3)
  const colors = new Float32Array(count * 3)
  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * 20
    const y = -Math.abs(Math.sin(x * 0.3)) * 0.8 - Math.random() * 0.6
    const z = (Math.random() - 0.5) * 8
    positions[i * 3] = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = z

    const base = 0.55 + Math.random() * 0.2
    colors[i * 3] = base * 0.55
    colors[i * 3 + 1] = base * 0.6
    colors[i * 3 + 2] = base * 0.7
  }
  return { positions, colors }
}

function BridgePointCloud({ intensity = 1 }: { intensity?: number }) {
  const { positions, colors } = useMemo(() => generateBridgePoints(), [])
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(positions, 3))
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3))
    return g
  }, [positions, colors])
  return (
    <points geometry={geom}>
      <pointsMaterial
        size={0.04 * intensity}
        vertexColors
        transparent
        opacity={0.85}
        sizeAttenuation
      />
    </points>
  )
}

function CrackPoints({
  lengthMm,
  widthMm,
  depthMm,
  offsetX = 0,
  highlight = false,
  color = "#ea580c",
  crackId,
  isOverlap = false,
}: {
  lengthMm: number
  widthMm: number
  depthMm: number
  offsetX?: number
  highlight?: boolean
  color?: string
  crackId: string
  isOverlap?: boolean
}) {
  const ref = useRef<THREE.Points>(null)
  useFrame((state) => {
    if (ref.current && highlight) {
      const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15
      ref.current.scale.setScalar(s)
    }
  })

  const length = Math.min(lengthMm / 400, 5)
  const width = Math.min(widthMm / 100, 0.8)
  const depth = Math.min(depthMm / 200, 0.5)

  const data = useMemo(() => {
    const count = 1200
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const t = Math.random()
      pos[i * 3] = -length / 2 + t * length + offsetX
      pos[i * 3 + 1] = -0.4 - Math.random() * depth - (Math.sin(t * Math.PI * 3) * 0.1)
      pos[i * 3 + 2] = (Math.random() - 0.5) * width
    }
    return pos
  }, [length, width, depth, offsetX])

  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry()
    g.setAttribute("position", new THREE.BufferAttribute(data, 3))
    return g
  }, [data])

  const c = new THREE.Color(color)

  return (
    <group>
      <points ref={ref} geometry={geom}>
        <pointsMaterial
          size={highlight ? 0.07 : 0.05}
          color={color}
          transparent
          opacity={highlight ? 1 : 0.85}
        />
      </points>
      {isOverlap && (
        <mesh position={[offsetX, -0.45, 0]}>
          <boxGeometry args={[length * 1.05, 0.05, width * 1.4]} />
          <meshBasicMaterial color="#dc2626" transparent opacity={0.25} />
        </mesh>
      )}
      <Html
        position={[offsetX + length / 2 + 0.3, 0.2, 0]}
        center
        distanceFactor={10}
        style={{ pointerEvents: "none" }}
      >
        <div
          className={cn(
            "px-1.5 py-0.5 text-[10px] font-mono whitespace-nowrap",
            highlight
              ? "bg-eng-warn text-white border border-eng-warn"
              : "bg-eng-panel/90 text-eng-dim border border-eng-border",
          )}
        >
          {crackId}
        </div>
      </Html>
    </group>
  )
}

function BridgeWireframe() {
  const points = useMemo(() => {
    const arr: [number, number, number][] = []
    for (let x = -10; x <= 10; x += 2) {
      arr.push([x, 0, -4])
      arr.push([x, 0, 4])
    }
    for (let z = -4; z <= 4; z += 2) {
      arr.push([-10, 0, z])
      arr.push([10, 0, z])
    }
    return arr
  }, [])

  return (
    <group>
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.05, 0.5, 0.05]} />
          <meshBasicMaterial color="#1e40af" transparent opacity={0.35} />
        </mesh>
      ))}
    </group>
  )
}

function SceneInner({
  params,
  originalParams,
  materials,
  compareMode,
}: Omit<BridgePointCloudProps, "onMaterialClick">) {
  const lengthMm = toMm(params.lengthValue, params.lengthUnit)
  const widthMm = toMm(params.widthValue, params.widthUnit)
  const depthMm = toMm(params.depthValue, params.depthUnit)

  const origLengthMm = originalParams
    ? toMm(originalParams.lengthValue, originalParams.lengthUnit)
    : lengthMm
  const origWidthMm = originalParams
    ? toMm(originalParams.widthValue, originalParams.widthUnit)
    : widthMm
  const origDepthMm = originalParams
    ? toMm(originalParams.depthValue, originalParams.depthUnit)
    : depthMm

  const isOverlap = !!params.collisionDetected
  const origOverlap = originalParams ? !!originalParams.collisionDetected : isOverlap

  return (
    <>
      <ambientLight intensity={0.35} />
      <directionalLight
        position={[8, 12, 5]}
        intensity={0.9}
        color="#bfdbfe"
        castShadow
      />
      <hemisphereLight args={["#38bdf8", "#1e293b", 0.4]} />

      <Grid
        args={[30, 30]}
        cellSize={1}
        cellThickness={0.5}
        cellColor="#334155"
        sectionSize={5}
        sectionThickness={1}
        sectionColor="#1e40af"
        fadeDistance={40}
        fadeStrength={1}
        followCamera={false}
        infiniteGrid={false}
      />

      <BridgeWireframe />

      {compareMode === "split" ? (
        <>
          <group position={[-6, 0, 0]}>
            <BridgePointCloud intensity={0.9} />
            <CrackPoints
              lengthMm={origLengthMm}
              widthMm={origWidthMm}
              depthMm={origDepthMm}
              color={origOverlap ? "#dc2626" : "#64748b"}
              crackId={`${params.crackId} · 修正前`}
              isOverlap={origOverlap}
            />
          </group>
          <group position={[6, 0, 0]}>
            <BridgePointCloud intensity={0.9} />
            <CrackPoints
              lengthMm={lengthMm}
              widthMm={widthMm}
              depthMm={depthMm}
              color={isOverlap ? "#dc2626" : "#ea580c"}
              highlight
              crackId={`${params.crackId} · 修正后`}
              isOverlap={isOverlap}
            />
          </group>
          <Line
            points={[
              [0, -2, 0],
              [0, 2, 0],
            ]}
            color="#1e40af"
            lineWidth={2}
            dashed
            dashSize={0.2}
          />
        </>
      ) : (
        <>
          <BridgePointCloud />
          {compareMode === "before" && originalParams ? (
            <CrackPoints
              lengthMm={origLengthMm}
              widthMm={origWidthMm}
              depthMm={origDepthMm}
              color={origOverlap ? "#dc2626" : "#64748b"}
              crackId={`${params.crackId} · 修正前`}
              isOverlap={origOverlap}
            />
          ) : (
            <CrackPoints
              lengthMm={lengthMm}
              widthMm={widthMm}
              depthMm={depthMm}
              color={isOverlap ? "#dc2626" : "#ea580c"}
              highlight
              crackId={params.crackId}
              isOverlap={isOverlap}
            />
          )}
        </>
      )}

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={35}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  )
}

export function Viewport3D({
  params,
  originalParams,
  materials,
  compareMode,
}: BridgePointCloudProps) {
  return (
    <Canvas
      camera={{ position: [8, 6, 10], fov: 45, near: 0.1, far: 200 }}
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 2]}
      style={{ background: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)" }}
    >
      <fog attach="fog" args={["#0f172a", 18, 45]} />
      <SceneInner
        params={params}
        originalParams={originalParams}
        materials={materials}
        compareMode={compareMode}
      />
    </Canvas>
  )
}
