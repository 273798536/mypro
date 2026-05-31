import { useRef, useState, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import type { Cell, SeverityLevel } from '@/types'
import { useStore, readings as allReadings, TIME_RANGE } from '@/store/useStore'
import * as THREE from 'three'

interface Props {
  cell: Cell
  position: [number, number, number]
  color: string
  isSelected: boolean
  isHighlighted: boolean
  severity: SeverityLevel
  onClick: () => void
}

export default function CellMesh({ cell, position, color, isSelected, isHighlighted, severity, onClick }: Props) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  const currentTime = useStore((s) => s.currentTime)

  const reading = useMemo(() => {
    const cellReadings = allReadings.filter((r) => r.cellId === cell.id)
    if (cellReadings.length === 0) return null
    let closest = cellReadings[0]
    let minDiff = Math.abs(cellReadings[0].timestamp - currentTime)
    for (const r of cellReadings) {
      const diff = Math.abs(r.timestamp - currentTime)
      if (diff < minDiff) {
        minDiff = diff
        closest = r
      }
    }
    return closest
  }, [cell.id, currentTime])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    const targetScale = isSelected ? 1.3 : hovered ? 1.15 : 1.0
    meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), delta * 8)

    if (severity === 'critical') {
      const pulse = (Math.sin(Date.now() * 0.005) + 1) * 0.15 + 0.7
      mat.emissiveIntensity = pulse
    } else if (severity === 'warning') {
      mat.emissiveIntensity = 0.4
    } else {
      mat.emissiveIntensity = 0.15
    }

    mat.opacity = isHighlighted ? 1.0 : 0.3
  })

  const emissiveColor = useMemo(() => new THREE.Color(color), [color])

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onClick={(e) => { e.stopPropagation(); onClick() }}
        onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'default' }}
      >
        <boxGeometry args={[0.16, 0.18, 0.16]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={0.3}
          transparent
          opacity={isHighlighted ? 1.0 : 0.3}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {isSelected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(0.22, 0.24, 0.22)]} />
          <lineBasicMaterial color="#ffffff" linewidth={2} />
        </lineSegments>
      )}

      {hovered && reading && (
        <Html
          position={[0, 0.25, 0]}
          center
          style={{ pointerEvents: 'none' }}
          zIndexRange={[100, 0]}
        >
          <div className="bg-gray-900/95 border border-gray-600 rounded px-2 py-1 text-xs whitespace-nowrap shadow-xl backdrop-blur">
            <div className="text-gray-300 font-mono">{cell.id}</div>
            <div className="text-amber-400">{reading.temperature.toFixed(1)}°C</div>
            <div className="text-cyan-400">{reading.voltage.toFixed(3)}V</div>
          </div>
        </Html>
      )}
    </group>
  )
}
