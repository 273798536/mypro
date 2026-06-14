import { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useAppStore } from '@/store/useAppStore'
import type { WindPoint, PointStatus } from '@/types'

function getStatusColor(status: PointStatus): number {
  switch (status) {
    case 'overlap':
      return 0xff6b35
    case 'missing':
      return 0x8d99ae
    case 'outlier':
      return 0xff3366
    case 'dirty':
      return 0xffaa00
    default:
      return 0x1b9aaa
  }
}

function SinglePoint({ point, isSelected, isHovered, isMulti }: {
  point: WindPoint
  isSelected: boolean
  isHovered: boolean
  isMulti: boolean
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const glowRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)

  useFrame((state) => {
    if (meshRef.current) {
      if (point.status === 'overlap') {
        const t = state.clock.elapsedTime
        meshRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.1)
      }
    }
    if (glowRef.current && (isSelected || isHovered || hovered || point.status !== 'normal')) {
      const t = state.clock.elapsedTime
      const s = 1.3 + Math.sin(t * 2) * 0.2
      glowRef.current.scale.setScalar(s)
      const mat = glowRef.current.material as THREE.MeshBasicMaterial
      mat.opacity = 0.3 + Math.sin(t * 2) * 0.15
    }
  })

  const color = getStatusColor(point.status)
  const visible = useAppStore((s) => {
    const layer = s.layers.find((l) => l.id === point.layerId)
    return layer?.visible ?? true
  })

  const selectPoint = useAppStore((s) => s.selectPoint)
  const hoverPoint = useAppStore((s) => s.hoverPoint)
  const toggleMultiSelect = useAppStore((s) => s.toggleMultiSelect)

  if (!visible) return null

  if (point.status === 'missing') {
    return (
      <group position={[point.x, point.y, point.z]}>
        <mesh
          onPointerOver={(e) => {
            e.stopPropagation()
            setHovered(true)
            hoverPoint(point.id)
          }}
          onPointerOut={(e) => {
            e.stopPropagation()
            setHovered(false)
            hoverPoint(null)
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (e.shiftKey) toggleMultiSelect(point.id)
            else selectPoint(point.id)
          }}
        >
          <ringGeometry args={[0.35, 0.5, 16]} />
          <meshBasicMaterial color={0x8d99ae} side={THREE.DoubleSide} transparent opacity={0.6} />
        </mesh>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.42, 0.02, 8, 24]} />
          <meshBasicMaterial color={0x8d99ae} transparent opacity={0.8} />
        </mesh>
        {(isSelected || isHovered || hovered) && (
          <Html position={[0, 1.2, 0]} center distanceFactor={10}>
            <div className="px-2 py-1 bg-gray-panel/95 border border-gray-border rounded text-xs whitespace-nowrap">
              <span className="font-mono text-gray-wait">{point.id}</span>
              <span className="text-gray-wait ml-2">缺失</span>
            </div>
          </Html>
        )}
      </group>
    )
  }

  const height = point.type === '风速仪' ? 1.2 : point.type === '风向标' ? 1.5 : 0.9

  return (
    <group
      position={[point.x, 0, point.z]}
      onPointerOver={(e) => {
        e.stopPropagation()
        setHovered(true)
        hoverPoint(point.id)
      }}
      onPointerOut={(e) => {
        e.stopPropagation()
        setHovered(false)
        hoverPoint(null)
      }}
      onClick={(e) => {
        e.stopPropagation()
        if (e.shiftKey) toggleMultiSelect(point.id)
        else selectPoint(point.id)
      }}
    >
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.06, 0.08, 0.1, 12]} />
        <meshStandardMaterial color={0x2d4a5f} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0, height / 2 + 0.1, 0]}>
        <cylinderGeometry args={[0.03, 0.03, height, 8]} />
        <meshStandardMaterial color={0x8d99ae} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh ref={meshRef} position={[0, height + 0.3, 0]}>
        {point.type === '风速仪' ? (
          <cylinderGeometry args={[0.22, 0.22, 0.15, 16]} />
        ) : point.type === '风向标' ? (
          <coneGeometry args={[0.22, 0.35, 4]} />
        ) : point.type === '温湿度' ? (
          <sphereGeometry args={[0.2, 16, 16]} />
        ) : (
          <boxGeometry args={[0.32, 0.2, 0.32]} />
        )}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={isSelected || hovered || isHovered ? 0.8 : point.status !== 'normal' ? 0.4 : 0.15}
          metalness={0.4}
          roughness={0.3}
        />
      </mesh>
      {(isSelected || isHovered || hovered || point.status !== 'normal') && (
        <mesh ref={glowRef} position={[0, height + 0.3, 0]}>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.25}
            side={THREE.BackSide}
          />
        </mesh>
      )}
      {isMulti && (
        <mesh position={[0, height + 0.65, 0]}>
          <ringGeometry args={[0.18, 0.28, 16]} />
          <meshBasicMaterial color={0x06d6a0} side={THREE.DoubleSide} />
        </mesh>
      )}
      {(isSelected || isHovered || hovered) && (
        <Html position={[0, height + 1, 0]} center distanceFactor={10}>
          <div className="px-2 py-1 bg-gray-panel/95 border border-cyan-industrial/50 rounded text-xs whitespace-nowrap shadow-glow-cyan">
            <div className="font-mono text-cyan-industrial">{point.id}</div>
            <div className="text-[10px] text-gray-wait">{point.type}</div>
          </div>
        </Html>
      )}
    </group>
  )
}

export default function WindPoints() {
  const points = useAppStore((s) => s.points)
  const selectedPointId = useAppStore((s) => s.selectedPointId)
  const hoveredPointId = useAppStore((s) => s.hoveredPointId)
  const selectedPointIds = useAppStore((s) => s.selectedPointIds)

  return (
    <group>
      {points.map((p) => (
        <SinglePoint
          key={p.id}
          point={p}
          isSelected={selectedPointId === p.id}
          isHovered={hoveredPointId === p.id}
          isMulti={selectedPointIds.includes(p.id)}
        />
      ))}
    </group>
  )
}
