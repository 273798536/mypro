import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { JawType, ContactPoint, CorrectionRecord } from '@/types'

interface SideBySideViewerProps {
  originalPoints: ContactPoint[]
  correctedPoints: ContactPoint[]
  corrections: CorrectionRecord[]
}

function ToothMesh({ position, jawType, isMisaligned }: { position: [number, number, number]; jawType: JawType; isMisaligned: boolean }) {
  const geometry = useMemo(() => {
    const shape = new THREE.Shape()
    const w = 0.28
    const h = 0.22
    shape.moveTo(-w, -h)
    shape.quadraticCurveTo(-w * 1.1, 0, -w, h)
    shape.quadraticCurveTo(0, h * 1.2, w, h)
    shape.quadraticCurveTo(w * 1.1, 0, w, -h)
    shape.quadraticCurveTo(0, -h * 1.1, -w, -h)
    return new THREE.ExtrudeGeometry(shape, {
      depth: 0.35,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.03,
      bevelSegments: 3,
    })
  }, [])

  const color = jawType === 'upper' ? '#FF6B6B' : '#4ECDC4'
  const emissiveColor = isMisaligned ? '#FFD93D' : '#000000'
  const emissiveIntensity = isMisaligned ? 0.3 : 0

  return (
    <mesh
      position={position}
      geometry={geometry}
      rotation={jawType === 'upper' ? [Math.PI, 0, 0] : [0, 0, 0]}
    >
      <meshStandardMaterial
        color={color}
        roughness={0.3}
        metalness={0.1}
        emissive={emissiveColor}
        emissiveIntensity={emissiveIntensity}
        transparent
        opacity={0.88}
      />
    </mesh>
  )
}

function ContactMarker({ position, color, size }: { position: [number, number, number]; color: string; size: number }) {
  return (
    <mesh position={position}>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.6} transparent opacity={0.9} />
    </mesh>
  )
}

function DiffLine({ start, end }: { start: [number, number, number]; end: [number, number, number] }) {
  const lineObj = useMemo(() => {
    const points = [
      new THREE.Vector3(...start),
      new THREE.Vector3(...end),
    ]
    const geometry = new THREE.BufferGeometry().setFromPoints(points)
    const material = new THREE.LineBasicMaterial({ color: '#E040FB', linewidth: 2 })
    return new THREE.Line(geometry, material)
  }, [start, end])

  return <primitive object={lineObj} />
}

function JawArchMini({ jawType }: { jawType: JawType }) {
  const teeth = useMemo(() => {
    const result: { position: [number, number, number]; toothNumber: string; isMisaligned: boolean }[] = []
    const yOffset = jawType === 'upper' ? 0.3 : -0.3
    const toothNumbers = jawType === 'upper'
      ? ['18', '17', '16', '15', '14', '13', '12', '11', '21', '22', '23', '24', '25', '26', '27', '28']
      : ['48', '47', '46', '45', '44', '43', '42', '41', '31', '32', '33', '34', '35', '36', '37', '38']
    for (let i = 0; i < 16; i++) {
      const angle = ((i - 7.5) / 8) * (Math.PI * 0.75)
      const radius = 1.8
      const x = Math.sin(angle) * radius
      const z = Math.cos(angle) * radius * 0.6 - 0.3
      result.push({ position: [x, yOffset, z], toothNumber: toothNumbers[i], isMisaligned: toothNumbers[i] === '26' })
    }
    return result
  }, [jawType])

  return (
    <group>
      {teeth.map((tooth) => (
        <ToothMesh
          key={`${jawType}-${tooth.toothNumber}`}
          position={tooth.position}
          jawType={jawType}
          isMisaligned={tooth.isMisaligned}
        />
      ))}
    </group>
  )
}

function SingleView({
  label,
  labelColor,
  opacity,
  contactPoints,
  corrections,
  showDiff,
  diffTargets,
}: {
  label: string
  labelColor: string
  opacity: number
  contactPoints: ContactPoint[]
  corrections: CorrectionRecord[]
  showDiff: boolean
  diffTargets?: Map<string, [number, number, number]>
}) {
  return (
    <div className="flex-1 relative">
      <div className={`absolute top-3 left-3 z-10 px-3 py-1.5 rounded-lg text-xs font-semibold ${labelColor} bg-bg-surface/90 backdrop-blur-sm border border-mono-dim/20`}>
        {label}
      </div>
      <Canvas className="w-full h-full" gl={{ antialias: true, alpha: true }}>
        <PerspectiveCamera makeDefault position={[0, 2.5, 4]} fov={45} near={0.1} far={100} />
        <OrbitControls enableDamping dampingFactor={0.05} minDistance={1} maxDistance={10} target={[0, 0, 0]} />
        <ambientLight intensity={0.3} color="#B8C4D0" />
        <directionalLight position={[3, 5, 2]} intensity={1.0} color="#FFF5E6" />
        <directionalLight position={[-2, -3, 1]} intensity={0.4} color="#E0F0FF" />
        <JawArchMini jawType="upper" />
        <JawArchMini jawType="lower" />
        {contactPoints.map((cp) => {
          const pos: [number, number, number] = [cp.positionX, cp.positionY, cp.positionZ]
          const color = cp.isMisaligned ? '#FFD93D' : cp.isOverlapping ? '#E040FB' : cp.jawType === 'upper' ? '#FF6B6B' : '#4ECDC4'
          return <ContactMarker key={cp.id} position={pos} color={color} size={0.04 + cp.intensity * 0.04} />
        })}
        {showDiff && diffTargets && corrections.map((correction) => {
          const target = diffTargets.get(correction.contactPointId)
          if (!target) return null
          return (
            <DiffLine
              key={correction.id}
              start={[correction.originalX, correction.originalY, correction.originalZ]}
              end={target}
            />
          )
        })}
      </Canvas>
      <div className="absolute inset-0 pointer-events-none" style={{ opacity: 1 - opacity, backgroundColor: '#555577' }} />
    </div>
  )
}

export default function SideBySideViewer({ originalPoints, correctedPoints, corrections }: SideBySideViewerProps) {
  const correctedMap = new Map(correctedPoints.map((cp) => [cp.id, [cp.positionX, cp.positionY, cp.positionZ] as [number, number, number]]))

  return (
    <div className="flex h-full gap-1">
      <SingleView
        label="修正前"
        labelColor="text-mono-muted"
        opacity={0.6}
        contactPoints={originalPoints}
        corrections={corrections}
        showDiff={corrections.length > 0}
        diffTargets={correctedMap}
      />
      <div className="w-px bg-overlap/40" />
      <SingleView
        label="修正后"
        labelColor="text-lower"
        opacity={1}
        contactPoints={correctedPoints}
        corrections={[]}
        showDiff={false}
      />
    </div>
  )
}
