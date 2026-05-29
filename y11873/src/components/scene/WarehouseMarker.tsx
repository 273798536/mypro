import { useState, useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useStore } from '@/store/useStore'
import type { Warehouse } from '@/types'

const SUPPLY_COLORS: Record<string, string> = {
  '沙袋': '#8B7355',
  '救生衣': '#FF6B35',
  '帐篷': '#4ECDC4',
  '食品': '#00D68F',
  '饮用水': '#5B9BD5',
  '医疗物资': '#E91E63',
  '发电机': '#FFC107',
  '照明设备': '#9C27B0',
}

const STATUS_COLORS: Record<string, string> = {
  normal: '#00d68f',
  isolated: '#ff6b35',
  overloaded: '#e91e63',
}

export default function WarehouseMarker({ warehouse }: { warehouse: Warehouse }) {
  const [hovered, setHovered] = useState(false)
  const bodyRef = useRef<THREE.Mesh>(null)
  const ringRef = useRef<THREE.Mesh>(null)
  const selectedWarehouseId = useStore(s => s.selectedWarehouseId)
  const setSelectedWarehouse = useStore(s => s.setSelectedWarehouse)
  const isSelected = selectedWarehouseId === warehouse.id

  const { position, supplies, status } = warehouse
  const [x, y, z] = position
  const statusColor = STATUS_COLORS[status] || '#00d68f'

  const totalQuantity = useMemo(
    () => supplies.reduce((sum, s) => sum + s.quantity, 0),
    [supplies]
  )

  const supplyGroups = useMemo(() => {
    const groups: { name: string; quantity: number; color: string }[] = []
    const map = new Map<string, number>()
    supplies.forEach(s => map.set(s.name, (map.get(s.name) || 0) + s.quantity))
    map.forEach((quantity, name) => {
      groups.push({ name, quantity, color: SUPPLY_COLORS[name] || '#888888' })
    })
    return groups
  }, [supplies])

  const barWidth = Math.min(Math.max(totalQuantity / 500, 0.6), 3.5)

  useFrame((state) => {
    if (bodyRef.current) {
      const mat = bodyRef.current.material as THREE.MeshStandardMaterial
      if (isSelected) {
        mat.emissiveIntensity = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.35
      } else {
        mat.emissiveIntensity = hovered ? 0.5 : 0.2
      }
    }
    if (ringRef.current) {
      if (isSelected) {
        const s = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.15
        ringRef.current.scale.setScalar(s)
      } else {
        ringRef.current.scale.setScalar(1)
      }
    }
  })

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={bodyRef}
        position={[0, 0.6, 0]}
        castShadow
        onClick={(e) => { e.stopPropagation(); setSelectedWarehouse(warehouse.id) }}
        onPointerOver={() => { setHovered(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHovered(false); document.body.style.cursor = 'auto' }}
      >
        <cylinderGeometry args={[0.15, 0.25, 1.2, 16]} />
        <meshStandardMaterial color={statusColor} emissive={statusColor} emissiveIntensity={0.2} />
      </mesh>

      <mesh ref={ringRef} position={[0, 1.3, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.3, 0.05, 8, 32]} />
        <meshStandardMaterial
          color={statusColor}
          emissive={statusColor}
          emissiveIntensity={isSelected ? 1.2 : 0.5}
          transparent
          opacity={0.85}
        />
      </mesh>

      <group position={[0, 1.8, 0]}>
        {supplyGroups.map((sg, i) => {
          const segWidth = barWidth * (sg.quantity / totalQuantity)
          const offset = supplyGroups.slice(0, i).reduce(
            (sum, s) => sum + barWidth * (s.quantity / totalQuantity), 0
          )
          return (
            <mesh key={sg.name} position={[offset - barWidth / 2 + segWidth / 2, 0, 0]}>
              <boxGeometry args={[segWidth, 0.12, 0.12]} />
              <meshStandardMaterial color={sg.color} emissive={sg.color} emissiveIntensity={0.3} />
            </mesh>
          )
        })}
      </group>

      {hovered && (
        <Html position={[0, 2.8, 0]} center distanceFactor={15}>
          <div style={{
            background: 'rgba(0,0,0,0.88)',
            color: '#fff',
            padding: '8px 14px',
            borderRadius: 8,
            fontSize: 12,
            whiteSpace: 'nowrap',
            pointerEvents: 'none',
            border: `1px solid ${statusColor}`,
            boxShadow: `0 0 12px ${statusColor}44`,
          }}>
            <div style={{ fontWeight: 'bold', marginBottom: 4, color: statusColor }}>{warehouse.name}</div>
            <div>物资种类: {supplies.length} 种</div>
            <div>物资总量: {totalQuantity} 件</div>
          </div>
        </Html>
      )}
    </group>
  )
}
