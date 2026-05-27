import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import { Html } from "@react-three/drei"
import * as THREE from "three"
import type { RiskFlag } from "@/types"
import { RISK_COLORS } from "@/types"
import { DEPARTMENTS } from "@/data/mockData"
import { useStore } from "@/store/useStore"

function getMonthIndex(dateStr: string): number {
  const d = new Date(dateStr)
  const baseMonth = new Date(2026, 5, 1)
  const diff = (d.getFullYear() - baseMonth.getFullYear()) * 12 + (d.getMonth() - baseMonth.getMonth())
  return Math.max(0, Math.min(11, diff))
}

function RiskMarker({
  flag,
  position,
}: {
  flag: RiskFlag
  position: [number, number, number]
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = React.useState(false)

  const color = RISK_COLORS[flag.type]

  useFrame(() => {
    if (!meshRef.current) return
    if (flag.severity === "critical") {
      meshRef.current.scale.setScalar(1 + Math.sin(Date.now() * 0.005) * 0.2)
    }
  })

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <sphereGeometry args={[0.18, 8, 8]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.8}
          transparent
          opacity={0.95}
        />
      </mesh>
      {hovered && (
        <Html
          position={[0, 0.5, 0]}
          center
          style={{
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          <div className="px-3 py-2 rounded-lg bg-[#1a1f36]/95 border border-white/20 text-xs text-white/90 shadow-xl backdrop-blur max-w-[240px]">
            <div className="flex items-center gap-1.5 mb-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span className="font-medium">
                {flag.severity === "critical" ? "严重" : flag.severity === "warning" ? "警告" : "提示"}
              </span>
            </div>
            <p className="text-white/60">{flag.message}</p>
          </div>
        </Html>
      )}
    </group>
  )
}

import React from "react"

export function RiskMarkers() {
  const riskFlags = useStore((s) => s.riskFlags)
  const items = useStore((s) => s.items)

  const markerData = useMemo(() => {
    return riskFlags.map((flag) => {
      const item = items.find((i) => i.id === flag.itemId)
      if (!item) return null

      const deptIndex = DEPARTMENTS.findIndex((d) => d.id === item.department)
      if (deptIndex < 0) return null

      const mi = getMonthIndex(item.dueDate)
      const xPos = (mi / 11) * 20 - 10
      const zPos = (deptIndex - 2) * 2.2
      const yPos = (item.amount / 10000 / 800 + 0.5) * 4

      return { flag, position: [xPos, yPos, zPos] as [number, number, number] }
    }).filter(Boolean) as { flag: RiskFlag; position: [number, number, number] }[]
  }, [riskFlags, items])

  return (
    <group>
      {markerData.map(({ flag, position }) => (
        <RiskMarker key={flag.id} flag={flag} position={position} />
      ))}
    </group>
  )
}
