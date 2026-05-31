import { useEffect, useRef } from "react"
import { useStore } from "@/store/useStore"
import { PIPELINE_COLORS, PIPELINE_TYPE_LABELS } from "@/types"

export default function CrossSectionView() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const clippingPlane = useStore((s) => s.clippingPlane)
  const getFilteredPipelines = useStore((s) => s.getFilteredPipelines)
  const setClippingPlane = useStore((s) => s.setClippingPlane)
  const selectPipeline = useStore((s) => s.selectPipeline)
  const selectedPipelineId = useStore((s) => s.selectedPipelineId)
  const filteredPipelines = getFilteredPipelines()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    ctx.scale(dpr, dpr)

    const w = rect.width
    const h = rect.height
    const padding = 40

    ctx.fillStyle = "#1a1d23"
    ctx.fillRect(0, 0, w, h)

    const minX = -8, maxX = 8
    const minY = -3, maxY = 0.5

    const toCanvasX = (x: number) => padding + ((x - minX) / (maxX - minX)) * (w - padding * 2)
    const toCanvasY = (y: number) => h - padding - ((y - minY) / (maxY - minY)) * (h - padding * 2)

    ctx.strokeStyle = "#2a2d36"
    ctx.lineWidth = 0.5
    for (let x = -8; x <= 8; x += 2) {
      ctx.beginPath()
      ctx.moveTo(toCanvasX(x), padding)
      ctx.lineTo(toCanvasX(x), h - padding)
      ctx.stroke()
    }
    for (let y = -3; y <= 0; y += 0.5) {
      ctx.beginPath()
      ctx.moveTo(padding, toCanvasY(y))
      ctx.lineTo(w - padding, toCanvasY(y))
      ctx.stroke()
    }

    ctx.fillStyle = "#6b7280"
    ctx.font = "10px JetBrains Mono, monospace"
    ctx.textAlign = "right"
    for (let y = -3; y <= 0; y += 0.5) {
      ctx.fillText(`${y.toFixed(1)}m`, padding - 4, toCanvasY(y) + 3)
    }
    ctx.textAlign = "center"
    for (let x = -8; x <= 8; x += 4) {
      ctx.fillText(`${x}m`, toCanvasX(x), h - padding + 14)
    }

    const groundY = toCanvasY(0)
    ctx.fillStyle = "#374151"
    ctx.fillRect(padding, groundY, w - padding * 2, 3)
    ctx.fillStyle = "#4b5563"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "left"
    ctx.fillText("地面标高 ±0.000", padding + 4, groundY - 6)

    const sectionPosition = clippingPlane.position
    const sectionY = toCanvasY(sectionPosition)
    ctx.strokeStyle = "#3b82f6"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(padding, sectionY)
    ctx.lineTo(w - padding, sectionY)
    ctx.stroke()
    ctx.setLineDash([])
    ctx.fillStyle = "#3b82f6"
    ctx.font = "10px sans-serif"
    ctx.textAlign = "right"
    ctx.fillText(`剖切位置 y=${sectionPosition.toFixed(2)}m`, w - padding - 4, sectionY - 6)

    const hitPipelines: { pipeline: typeof filteredPipelines[0]; x: number; z: number; radius: number; y: number }[] = []

    filteredPipelines.forEach((pipeline) => {
      pipeline.segments.forEach((seg) => {
        const [sx, sy, sz] = seg.startPoint
        const [ex, ey, ez] = seg.endPoint

        const minSegY = Math.min(sy, ey)
        const maxSegY = Math.max(sy, ey)

        if (sectionPosition >= minSegY - 0.01 && sectionPosition <= maxSegY + 0.01) {
          const t = sy === ey ? 0.5 : (sectionPosition - sy) / (ey - sy)
          const x = sx + t * (ex - sx)
          const z = sz + t * (ez - sz)
          const radius = Math.max(pipeline.diameter / 2, 0.03)

          hitPipelines.push({
            pipeline,
            x,
            z,
            radius,
            y: sectionPosition,
          })
        }
      })
    })

    hitPipelines.forEach(({ pipeline, x, z, radius }) => {
      const cx = toCanvasX(x)
      const cy = toCanvasY(pipeline.segments[0].elevation)
      const r = Math.max(radius * ((w - padding * 2) / (maxX - minX)), 3)

      const isSelected = selectedPipelineId === pipeline.id

      if (isSelected) {
        ctx.beginPath()
        ctx.arc(cx, cy, r + 5, 0, Math.PI * 2)
        ctx.fillStyle = `${pipeline.color}33`
        ctx.fill()
      }

      const gradient = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx, cy, r)
      gradient.addColorStop(0, `${pipeline.color}`)
      gradient.addColorStop(1, `${pipeline.color}aa`)

      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.fillStyle = gradient
      ctx.fill()
      ctx.strokeStyle = "#ffffff44"
      ctx.lineWidth = 0.5
      ctx.stroke()

      ctx.strokeStyle = pipeline.color
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(cx + r + 4, cy)
      ctx.lineTo(cx + r + 16, cy)
      ctx.stroke()

      ctx.fillStyle = pipeline.color
      ctx.font = "9px JetBrains Mono, monospace"
      ctx.textAlign = "left"
      ctx.fillText(`${PIPELINE_TYPE_LABELS[pipeline.type]} Φ${pipeline.diameter.toFixed(2)}`, cx + r + 20, cy + 3)

      ctx.fillStyle = "#6b7280"
      ctx.fillText(`标高${pipeline.segments[0].elevation.toFixed(2)}m`, cx + r + 20, cy + 14)
    })

    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      const clickX = e.clientX - rect.left
      const clickY = e.clientY - rect.top

      for (const { pipeline, x, radius } of hitPipelines) {
        const cx = toCanvasX(x)
        const cy = toCanvasY(pipeline.segments[0].elevation)
        const r = Math.max(radius * ((w - padding * 2) / (maxX - minX)), 3)
        const dist = Math.sqrt((clickX - cx) ** 2 + (clickY - cy) ** 2)
        if (dist < r + 8) {
          selectPipeline(pipeline.id)
          return
        }
      }
      selectPipeline(null)
    }

    canvas.addEventListener("click", handleClick)
    return () => canvas.removeEventListener("click", handleClick)
  }, [filteredPipelines, clippingPlane, selectedPipelineId, selectPipeline])

  return (
    <div className="flex flex-col gap-3 p-4">
      <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-400">剖切控制</h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-12">启用</span>
          <button
            onClick={() => setClippingPlane({ enabled: !clippingPlane.enabled })}
            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
              clippingPlane.enabled ? "bg-blue-500" : "bg-[#2a2d36]"
            }`}
          >
            <span
              className={`inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform ${
                clippingPlane.enabled ? "translate-x-4.5" : "translate-x-0.5"
              }`}
            />
          </button>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-12">位置</span>
          <input
            type="range"
            min="-3"
            max="0"
            step="0.1"
            value={clippingPlane.position}
            onChange={(e) => setClippingPlane({ position: parseFloat(e.target.value) })}
            className="flex-1 accent-blue-500"
            disabled={!clippingPlane.enabled}
          />
          <span className="text-xs text-zinc-400 w-12 font-mono">{clippingPlane.position.toFixed(1)}m</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <span className="text-xs text-zinc-500 w-12">方向</span>
          <select
            value={clippingPlane.direction}
            onChange={(e) => setClippingPlane({ direction: e.target.value as "x" | "y" | "z" })}
            className="flex-1 rounded border border-[#2a2d36] bg-[#1e2028] px-2 py-1 text-xs text-zinc-300 outline-none focus:border-blue-500"
          >
            <option value="x">X轴</option>
            <option value="y">Y轴（标高）</option>
            <option value="z">Z轴</option>
          </select>
        </div>
      </div>

      <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">2D截面视图</h3>
        <div className="relative">
          <canvas
            ref={canvasRef}
            style={{ width: "100%", height: "240px" }}
            className="rounded bg-[#1a1d23]"
          />
        </div>
        <p className="mt-2 text-xs text-zinc-500">点击截面中的管线可查看详情，与3D视图同步选中</p>
      </div>

      <div className="rounded-lg border border-[#2a2d36] bg-[#252830] p-3">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">图例</h3>
        <div className="grid grid-cols-2 gap-2 text-xs">
          {Object.entries(PIPELINE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2 text-zinc-300">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{PIPELINE_TYPE_LABELS[type as keyof typeof PIPELINE_TYPE_LABELS]}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
