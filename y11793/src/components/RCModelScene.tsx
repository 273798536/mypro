import type { ColorRepresentation } from 'three'
import { useMemo, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Html } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import { Vector3 } from 'three'
import type { RCParams, ParameterBounds } from '@/types'
import type { AlertSeverity } from '@/shared/types'
import BatteryShell from './BatteryShell'
import Resistor3D from './Resistor3D'
import Capacitor3D from './Capacitor3D'
import CircuitLine from './CircuitLine'

type ComponentType = 'ocv' | 'R0' | 'R1' | 'C1'

interface RCModelSceneProps {
  params: RCParams
  bounds: ParameterBounds
  selectedComponent: ComponentType | null
  onComponentSelect: (component: ComponentType | null) => void
  hasAlerts?: boolean
  alertSeverity?: AlertSeverity
}

const POSITIONS = {
  ocv: new Vector3(-1.8, 0, 0),
  R0: new Vector3(-0.5, 0, 0),
  R1: new Vector3(0.8, 0.8, 0),
  C1: new Vector3(0.8, -0.8, 0),
}

const LINE_COLORS: Record<'normal' | 'warning' | 'fatal', ColorRepresentation> = {
  normal: '#3b82f6',
  warning: '#f97316',
  fatal: '#ef4444',
}

const LIGHT_COLORS: Record<'normal' | 'warning' | 'fatal', ColorRepresentation> = {
  normal: '#ffffff',
  warning: '#fbbf24',
  fatal: '#ef4444',
}

function VoltageSource({
  position,
  label,
  value,
  bounds,
  isSelected,
  onClick,
}: {
  position: Vector3
  label: string
  value: number
  bounds: [number, number]
  isSelected: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <group position={position}>
      <group
        onClick={onClick}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
        }}
        onPointerOut={(e) => {
          e.stopPropagation()
          setHovered(false)
        }}
      >
          <mesh>
            <cylinderGeometry args={[0.4, 0.4, 0.15, 32]} />
            <meshStandardMaterial
              color="#22c55e"
              emissive="#22c55e"
              emissiveIntensity={hovered || isSelected ? 0.6 : 0.2}
              metalness={0.7}
              roughness={0.3}
            />
          </mesh>

          <mesh position={[0, 0, 0.1]} rotation={[Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.45, 0.5, 32]} />
            <meshStandardMaterial
              color="#86efac"
              emissive={isSelected ? '#fbbf24' : '#22c55e'}
              emissiveIntensity={isSelected ? 0.5 : 0.2}
              metalness={0.9}
              roughness={0.1}
              side={2}
            />
          </mesh>

          <mesh position={[0.35, 0.15, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial
              color="#fbbf24"
              emissive="#fbbf24"
              emissiveIntensity={0.8}
            />
          </mesh>

          <mesh position={[0.35, -0.15, 0]}>
            <sphereGeometry args={[0.06, 16, 16]} />
            <meshStandardMaterial
              color="#3b82f6"
              emissive="#3b82f6"
              emissiveIntensity={0.8}
            />
          </mesh>

          {(hovered || isSelected) && (
            <Html
              position={[0.6, 0, 0]}
              center
              distanceFactor={6}
              style={{ pointerEvents: 'none' }}
            >
              <div className="bg-slate-900/95 backdrop-blur-sm border border-slate-700 rounded-lg px-3 py-2 shadow-xl min-w-[140px]">
                <div className="text-xs font-semibold text-slate-300 mb-1">{label}</div>
                <div className="text-lg font-bold text-white">
                  {value.toFixed(3)} V
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  范围: [{bounds[0].toFixed(1)}, {bounds[1].toFixed(1)}]
                </div>
              </div>
            </Html>
          )}
        </group>
    </group>
  )
}

function CircuitLines({
  lineColor,
  selectedComponent,
}: {
  lineColor: ColorRepresentation
  selectedComponent: ComponentType | null
}) {
  const lines = useMemo(() => {
    const result: Array<{ points: Vector3[]; opacity: number }> = []

    const ocvRight = new Vector3(-1.4, 0, 0)
    const r0Left = new Vector3(-0.9, 0, 0)
    const r0Right = new Vector3(-0.1, 0, 0)
    const branchTop = new Vector3(0.4, 0.8, 0)
    const branchBottom = new Vector3(0.4, -0.8, 0)
    const r1Left = new Vector3(0.3, 0.8, 0)
    const r1Right = new Vector3(1.3, 0.8, 0)
    const c1Left = new Vector3(0.3, -0.8, 0)
    const c1Right = new Vector3(1.3, -0.8, 0)
    const mergeTop = new Vector3(1.8, 0.8, 0)
    const mergeBottom = new Vector3(1.8, -0.8, 0)
    const mergePoint = new Vector3(1.8, 0, 0)

    result.push({
      points: [ocvRight, r0Left],
      opacity: selectedComponent === 'ocv' || selectedComponent === 'R0' ? 1 : 0.6,
    })

    result.push({
      points: [r0Right, branchTop, r1Left],
      opacity: selectedComponent === 'R0' || selectedComponent === 'R1' ? 1 : 0.6,
    })

    result.push({
      points: [r0Right, branchBottom, c1Left],
      opacity: selectedComponent === 'R0' || selectedComponent === 'C1' ? 1 : 0.6,
    })

    result.push({
      points: [r1Right, mergeTop, mergePoint],
      opacity: selectedComponent === 'R1' ? 1 : 0.6,
    })

    result.push({
      points: [c1Right, mergeBottom, mergePoint],
      opacity: selectedComponent === 'C1' ? 1 : 0.6,
    })

    return result
  }, [selectedComponent])

  return (
    <>
      {lines.map((line, index) => (
        <CircuitLine
          key={index}
          points={line.points}
          color={lineColor}
          opacity={line.opacity}
        />
      ))}
    </>
  )
}

function SceneContent({
  params,
  bounds,
  selectedComponent,
  onComponentSelect,
  hasAlerts = false,
  alertSeverity = 'warning',
}: RCModelSceneProps) {
  const status: 'normal' | 'warning' | 'fatal' = hasAlerts
    ? alertSeverity === 'fatal' ? 'fatal' : 'warning'
    : 'normal'

  const lineColor = LINE_COLORS[status]
  const lightColor = LIGHT_COLORS[status]

  return (
    <>
      <ambientLight intensity={0.4} color="#e2e8f0" />

      <directionalLight
        position={[5, 8, 5]}
        intensity={1.2}
        color="#f1f5f9"
        castShadow
      />

      <pointLight
        position={[0, 2, 2]}
        intensity={hasAlerts ? 1.5 : 0.8}
        color={lightColor}
        distance={8}
      />

      <pointLight
        position={[0, -2, -2]}
        intensity={0.3}
        color="#cbd5e1"
        distance={6}
      />

      <BatteryShell />

      <CircuitLines lineColor={lineColor} selectedComponent={selectedComponent} />

      <VoltageSource
        position={POSITIONS.ocv}
        label="开路电压 (OCV)"
        value={params.ocv}
        bounds={bounds.ocv}
        isSelected={selectedComponent === 'ocv'}
        onClick={() => onComponentSelect(selectedComponent === 'ocv' ? null : 'ocv')}
      />

      <Resistor3D
        position={POSITIONS.R0}
        color="#92400e"
        label="欧姆电阻 (R₀)"
        value={params.R0}
        bounds={bounds.R0}
        isSelected={selectedComponent === 'R0'}
        onClick={() => onComponentSelect(selectedComponent === 'R0' ? null : 'R0')}
      />

      <Resistor3D
        position={POSITIONS.R1}
        color="#ea580c"
        label="极化电阻 (R₁)"
        value={params.R1}
        bounds={bounds.R1}
        isSelected={selectedComponent === 'R1'}
        onClick={() => onComponentSelect(selectedComponent === 'R1' ? null : 'R1')}
      />

      <Capacitor3D
        position={POSITIONS.C1}
        color="#2563eb"
        label="极化电容 (C₁)"
        value={params.C1}
        bounds={bounds.C1}
        isSelected={selectedComponent === 'C1'}
        onClick={() => onComponentSelect(selectedComponent === 'C1' ? null : 'C1')}
      />

      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={4}
        maxDistance={15}
        autoRotate={false}
      />

      <EffectComposer>
        <Bloom
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          intensity={1.5}
          mipmapBlur
        />
      </EffectComposer>
    </>
  )
}

export default function RCModelScene(props: RCModelSceneProps) {
  return (
    <Canvas
      camera={{ position: [4, 4, 6], fov: 45 }}
      gl={{ antialias: true, alpha: true }}
      dpr={[1, 2]}
    >
      <color attach="background" args={['#0f172a']} />
      <fog attach="fog" args={['#0f172a', 10, 25]} />
      <SceneContent {...props} />
    </Canvas>
  )
}
