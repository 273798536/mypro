import { useMemo } from "react"
import { Html, Line } from "@react-three/drei"
import { DEPARTMENTS } from "@/data/mockData"
import { useStore } from "@/store/useStore"
import { formatCurrency } from "@/utils/currency"

const MONTH_LABELS = Array.from({ length: 12 }, (_, i) => {
  const d = new Date(2026, 5 + i, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
})

export function SceneLabels() {
  const selectedCurrency = useStore((s) => s.selectedCurrency)
  const items = useStore((s) => s.items)

  const yScaleLabels = useMemo(() => {
    const maxAmount = Math.max(...items.map((i) => i.amount), 1)
    const steps = 4
    return Array.from({ length: steps + 1 }, (_, i) => {
      const val = (maxAmount / steps) * i
      return {
        y: (i / steps) * 4,
        label: formatCurrency(val, selectedCurrency),
      }
    })
  }, [items, selectedCurrency])

  return (
    <group>
      {MONTH_LABELS.map((label, i) => {
        const x = (i / 11) * 20 - 10
        return (
          <group key={`month-${i}`}>
            <Html
              position={[x, -0.1, 4.5]}
              center
              style={{ pointerEvents: "none" }}
            >
              <div className="text-[10px] text-white/40 font-mono whitespace-nowrap">
                {label}
              </div>
            </Html>
          </group>
        )
      })}

      {DEPARTMENTS.map((dept, i) => {
        const z = (i - 2) * 2.2
        return (
          <group key={`dept-${dept.id}`}>
            <Html
              position={[-11, 0, z]}
              center
              style={{ pointerEvents: "none" }}
            >
              <div
                className="text-[11px] font-medium whitespace-nowrap"
                style={{ color: dept.color }}
              >
                {dept.name}
              </div>
            </Html>
          </group>
        )
      })}

      {yScaleLabels.map(({ y, label }, i) => (
        <Html
          key={`yscale-${i}`}
          position={[-11.5, y, -2]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div className="text-[9px] text-white/30 font-mono whitespace-nowrap">
            {label}
          </div>
        </Html>
      ))}

      <gridHelper
        args={[24, 24, "#1a1f36", "#1e2440"]}
        position={[0, -0.05, 0]}
        rotation={[0, 0, 0]}
      />

      <Line
        points={[
          [-10, 0, -2.5],
          [10, 0, -2.5],
        ]}
        color="#4fc3f7"
        lineWidth={0.5}
        transparent
        opacity={0.3}
      />
      <Line
        points={[
          [-10, 0, -2.5],
          [-10, 4.5, -2.5],
        ]}
        color="#4fc3f7"
        lineWidth={0.5}
        transparent
        opacity={0.3}
      />
    </group>
  )
}
