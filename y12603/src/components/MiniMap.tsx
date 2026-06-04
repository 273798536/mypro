import { useEffect, useRef } from "react"
import type { Defect } from "@/types"

interface MiniMapProps {
  defects: Defect[]
  currentId: string
  size?: number
}

export default function MiniMap({ defects, currentId, size = 200 }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !defects.length) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, size, size)

    const xs = defects.map((d) => d.posX)
    const ys = defects.map((d) => d.posY)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const scale = (size - 20) / Math.max(rangeX, rangeY)
    const offsetX = (size - rangeX * scale) / 2
    const offsetY = (size - rangeY * scale) / 2

    defects.forEach((d) => {
      const x = (d.posX - minX) * scale + offsetX
      const y = (d.posY - minY) * scale + offsetY
      const isCurrent = d.id === currentId
      ctx.beginPath()
      ctx.arc(x, y, isCurrent ? 5 : 3, 0, Math.PI * 2)
      ctx.fillStyle = isCurrent ? "#E87722" : "#607D8B"
      ctx.fill()
      if (isCurrent) {
        ctx.strokeStyle = "#E87722"
        ctx.lineWidth = 2
        ctx.stroke()
      }
    })
  }, [defects, currentId, size])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <h4 className="mb-2 text-xs font-medium text-gray-500">位置概览</h4>
      <canvas
        ref={canvasRef}
        width={size}
        height={size}
        className="rounded bg-gray-50"
      />
    </div>
  )
}
