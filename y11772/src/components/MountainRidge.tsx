import { useRef, useMemo, useCallback } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { CashFlowItem } from "@/types"
import { DEPARTMENTS } from "@/data/mockData"
import { useStore } from "@/store/useStore"

interface MountainRidgeProps {
  items: CashFlowItem[]
}

const MONTHS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 5 + i, 1)
  return d.toISOString().slice(0, 7)
})

function getMonthIndex(dateStr: string): number {
  const d = new Date(dateStr)
  const baseMonth = new Date(2026, 5, 1)
  const diff = (d.getFullYear() - baseMonth.getFullYear()) * 12 + (d.getMonth() - baseMonth.getMonth())
  return Math.max(0, Math.min(11, diff))
}

function RidgeMesh({
  deptId,
  deptItems,
  color,
}: {
  deptId: string
  deptItems: CashFlowItem[]
  color: string
}) {
  const meshRef = useRef<THREE.Mesh>(null)
  const hoveredItemRef = useRef<string | null>(null)
  const setSelectedItemIds = useStore((s) => s.setSelectedItemIds)
  const setHoveredItemId = useStore((s) => s.setHoveredItemId)
  const riskFlags = useStore((s) => s.riskFlags)

  const { geometry, itemMap } = useMemo(() => {
    const segX = 60
    const segZ = 1
    const width = 20
    const depth = 1.6

    const monthlyAmounts = new Array(12).fill(0)
    const monthlyItems: CashFlowItem[][] = new Array(12).fill(null).map(() => [])

    deptItems.forEach((item) => {
      const mi = getMonthIndex(item.dueDate)
      monthlyAmounts[mi] += item.amount / 10000
      monthlyItems[mi].push(item)
    })

    const maxAmount = Math.max(...monthlyAmounts, 1)
    const normalizedAmounts = monthlyAmounts.map((a) => (a / maxAmount) * 4)

    const geo = new THREE.PlaneGeometry(width, depth, segX, segZ)
    geo.rotateX(-Math.PI / 2)

    const posAttr = geo.getAttribute("position")
    const itemPositionMap: Map<number, CashFlowItem[]> = new Map()

    for (let i = 0; i <= segX; i++) {
      const t = i / segX
      const monthFloat = t * 11
      const m0 = Math.floor(monthFloat)
      const m1 = Math.min(m0 + 1, 11)
      const frac = monthFloat - m0

      let h = normalizedAmounts[m0] * (1 - frac) + normalizedAmounts[m1] * frac
      h = Math.max(h, 0.05)

      const centerBonus = 1 - Math.abs(t - 0.5) * 0.3
      h *= centerBonus

      for (let j = 0; j <= segZ; j++) {
        const idx = i * (segZ + 1) + j
        const x = posAttr.getX(idx)
        posAttr.setY(idx, h)
      }

      if (i % 5 === 0 && m0 < 12) {
        itemPositionMap.set(i, monthlyItems[m0])
      }
    }

    posAttr.needsUpdate = true
    geo.computeVertexNormals()

    return { geometry: geo, itemMap: itemPositionMap }
  }, [deptItems])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        emissive: new THREE.Color(color).multiplyScalar(0.35),
        metalness: 0.2,
        roughness: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.9,
      }),
    [color]
  )

  const deptIndex = DEPARTMENTS.findIndex((d) => d.id === deptId)
  const zOffset = (deptIndex - 2) * 2.2

  const deptRisks = useMemo(
    () => riskFlags.filter((f) => deptItems.some((item) => item.id === f.itemId)),
    [riskFlags, deptItems]
  )

  const riskItemIds = useMemo(
    () => new Set(deptRisks.map((r) => r.itemId)),
    [deptRisks]
  )

  const handleClick = useCallback(
    (e: THREE.Event) => {
      const event = e as unknown as { face?: { a: number } }
      if (!event.face) return
      const faceA = event.face.a
      const segX = 60
      const segZ = 1
      const vi = faceA % ((segX + 1) * (segZ + 1))
      const col = vi % (segX + 1)
      const nearest = Math.round(col / 5) * 5
      const items = itemMap.get(nearest)
      if (items && items.length > 0) {
        setSelectedItemIds(items.map((i) => i.id))
      }
    },
    [itemMap, setSelectedItemIds]
  )

  const handlePointerOver = useCallback(
    (e: THREE.Event) => {
      const event = e as unknown as { face?: { a: number } }
      if (!event.face) return
      const faceA = event.face.a
      const segX = 60
      const segZ = 1
      const vi = faceA % ((segX + 1) * (segZ + 1))
      const col = vi % (segX + 1)
      const nearest = Math.round(col / 5) * 5
      const items = itemMap.get(nearest)
      if (items && items.length > 0) {
        hoveredItemRef.current = items[0].id
        setHoveredItemId(items[0].id)
      }
    },
    [itemMap, setHoveredItemId]
  )

  const handlePointerOut = useCallback(() => {
    hoveredItemRef.current = null
    setHoveredItemId(null)
  }, [setHoveredItemId])

  useFrame((_, delta) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.MeshStandardMaterial
    const hasLowConfidence = deptRisks.some((r) => r.type === "low_confidence")
    if (hasLowConfidence) {
      mat.opacity = 0.6 + Math.sin(Date.now() * 0.003) * 0.15
    }
  })

  return (
    <group position={[0, 0, zOffset]}>
      <mesh
        ref={meshRef}
        geometry={geometry}
        material={material}
        onClick={handleClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      />
      {deptItems
        .filter((item) => riskItemIds.has(item.id))
        .map((item) => {
          const mi = getMonthIndex(item.dueDate)
          const xPos = (mi / 11) * 20 - 10
          const posAttr = geometry.getAttribute("position")
          const col = Math.round((mi / 11) * 60)
          const yVal = posAttr.getY(Math.min(col, 60))

          const itemRisks = deptRisks.filter((r) => r.itemId === item.id)
          const riskColor = itemRisks.find((r) => r.type === "date_misalignment")
            ? "#ef5350"
            : itemRisks.find((r) => r.type === "currency_unconverted")
            ? "#ff9800"
            : "#fdd835"

          return (
            <mesh key={item.id} position={[xPos, yVal + 0.3, 0]}>
              <octahedronGeometry args={[0.15, 0]} />
              <meshStandardMaterial
                color={riskColor}
                emissive={riskColor}
                emissiveIntensity={0.6}
                transparent
                opacity={0.9}
              />
            </mesh>
          )
        })}
    </group>
  )
}

export function MountainRidge({ items }: MountainRidgeProps) {
  const itemsByDept = useMemo(() => {
    const map = new Map<string, CashFlowItem[]>()
    DEPARTMENTS.forEach((d) => map.set(d.id, []))
    items.forEach((item) => {
      if (map.has(item.department)) {
        map.get(item.department)!.push(item)
      }
    })
    return map
  }, [items])

  return (
    <group>
      {DEPARTMENTS.map((dept) => {
        const deptItems = itemsByDept.get(dept.id) ?? []
        if (deptItems.length === 0) return null
        return (
          <RidgeMesh
            key={dept.id}
            deptId={dept.id}
            deptItems={deptItems}
            color={dept.color}
          />
        )
      })}
    </group>
  )
}
