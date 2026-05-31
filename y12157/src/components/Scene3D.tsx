import { useRef, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Stars, Html, Line, Grid } from '@react-three/drei'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

type ErrorEllipsoidProps = {
  axes: [number, number, number]
  labels: [string, string, string]
  position?: [number, number, number]
}

function ErrorEllipsoid({ axes, labels, position = [0, 0, 0] }: ErrorEllipsoidProps) {
  const groupRef = useRef<THREE.Group>(null)
  const target = useMemo(() => new THREE.Vector3(...axes), [axes])

  useFrame(() => {
    if (!groupRef.current) return
    groupRef.current.scale.lerp(target, 0.05)
  })

  const labelPositions: [number, number, number][] = useMemo(
    () => [[axes[0] + 0.3, 0, 0], [0, axes[1] + 0.3, 0], [0, 0, axes[2] + 0.3]],
    [axes],
  )

  return (
    <group position={position}>
      <group ref={groupRef}>
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshStandardMaterial
            color="#00ff88"
            transparent
            opacity={0.15}
            side={THREE.DoubleSide}
          />
        </mesh>
        <mesh>
          <sphereGeometry args={[1, 32, 32]} />
          <meshBasicMaterial color="#00ff88" wireframe transparent opacity={0.4} />
        </mesh>
      </group>
      {labels.map((label, i) => (
        <Html key={label} position={labelPositions[i]} center>
          <span
            style={{
              color: '#00ff88',
              fontSize: 12,
              fontFamily: 'monospace',
              whiteSpace: 'nowrap',
            }}
          >
            {label}
          </span>
        </Html>
      ))}
    </group>
  )
}

type PropagationStepData = {
  variableSymbol: string
  percentage: number
  position: [number, number, number]
}

type PropagationPathsProps = {
  steps: PropagationStepData[]
  center: [number, number, number]
}

function PropagationPaths({ steps, center }: PropagationPathsProps) {
  return (
    <group>
      {steps.map((step) => (
        <Line
          key={step.variableSymbol}
          points={[step.position, center]}
          color="#00ff88"
          lineWidth={1 + (step.percentage / 100) * 4}
          transparent
          opacity={0.2 + (step.percentage / 100) * 0.8}
        />
      ))}
    </group>
  )
}

function AxisGrid() {
  return (
    <group>
      <gridHelper args={[20, 20, '#2d2d44', '#2d2d44']} />
      <Line points={[[0, 0, 0], [5, 0, 0]]} color="red" lineWidth={1} />
      <Line points={[[0, 0, 0], [0, 5, 0]]} color="green" lineWidth={1} />
      <Line points={[[0, 0, 0], [0, 0, 5]]} color="blue" lineWidth={1} />
      <Html position={[5.3, 0, 0]} center>
        <span style={{ color: 'red', fontSize: 11, fontFamily: 'monospace' }}>X</span>
      </Html>
      <Html position={[0, 5.3, 0]} center>
        <span style={{ color: 'green', fontSize: 11, fontFamily: 'monospace' }}>Y</span>
      </Html>
      <Html position={[0, 0, 5.3]} center>
        <span style={{ color: 'blue', fontSize: 11, fontFamily: 'monospace' }}>Z</span>
      </Html>
    </group>
  )
}

function SceneContent() {
  const variables = useStore((s) => s.variables)
  const errorPropagation = useStore((s) => s.errorPropagation)
  const currentTemplateId = useStore((s) => s.currentTemplateId)

  const { axes, labels, propSteps } = useMemo(() => {
    const defaultAxes: [number, number, number] = [0.3, 0.3, 0.3]
    const defaultLabels: [string, string, string] = ['X', 'Y', 'Z']

    if (variables.length === 0) {
      return { axes: defaultAxes, labels: defaultLabels, propSteps: [] as PropagationStepData[] }
    }

    const uncertainties = variables.map((v) => v.uncertainty)
    const maxU = Math.max(...uncertainties)
    const scaled = uncertainties.map((u) => (maxU === 0 ? 0.3 : 0.3 + (u / maxU) * 1.7))

    let axes: [number, number, number]
    let labels: [string, string, string]
    let positions: [number, number, number][]

    if (variables.length >= 3) {
      axes = [scaled[0], scaled[1], scaled[2]]
      labels = [variables[0].symbol, variables[1].symbol, variables[2].symbol]
      positions = [
        [axes[0] + 0.5, 0, 0],
        [0, axes[1] + 0.5, 0],
        [0, 0, axes[2] + 0.5],
      ]
    } else if (variables.length === 2) {
      axes = [scaled[0], 0.3, scaled[1]]
      labels = [variables[0].symbol, 'Y', variables[1].symbol]
      positions = [
        [axes[0] + 0.5, 0, 0],
        [0, 0, axes[2] + 0.5],
      ]
    } else {
      axes = [scaled[0], 0.3, 0.3]
      labels = [variables[0].symbol, 'Y', 'Z']
      positions = [[axes[0] + 0.5, 0, 0]]
    }

    const propSteps = (errorPropagation?.steps ?? []).map((step) => {
      const idx = variables.findIndex((v) => v.id === step.variableId)
      const pos: [number, number, number] =
        idx >= 0 && idx < positions.length ? positions[idx] : [0, 0, 0]
      return { variableSymbol: step.variableSymbol, percentage: step.percentage, position: pos }
    })

    return { axes, labels, propSteps }
  }, [variables, errorPropagation])

  if (!currentTemplateId) {
    return (
      <>
        <ambientLight intensity={0.3} />
        <Stars count={500} speed={0.5} />
        <Html center>
          <span style={{ color: '#00ff88', fontSize: 14, fontFamily: 'monospace' }}>
            Load a template to visualize error propagation
          </span>
        </Html>
        <OrbitControls />
      </>
    )
  }

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[5, 5, 5]} intensity={0.8} color="#00ff88" />
      <AxisGrid />
      <ErrorEllipsoid axes={axes} labels={labels} />
      <PropagationPaths steps={propSteps} center={[0, 0, 0]} />
      <OrbitControls />
      <Stars count={500} speed={0.5} />
      <EffectComposer>
        <Bloom intensity={0.8} luminanceThreshold={0.6} />
      </EffectComposer>
    </>
  )
}

export default function Scene3D() {
  return (
    <Canvas camera={{ position: [5, 4, 5], fov: 45 }} style={{ background: '#0a0a1a' }}>
      <SceneContent />
    </Canvas>
  )
}
