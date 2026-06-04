import { useRef, useState, useCallback, useEffect } from "react"
import { Square, Hand, ZoomIn, ZoomOut } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Defect, ColorRule } from "@/types"

type Tool = "rect" | "hand"

interface Props {
  defects: Defect[]
  colorRules: ColorRule[]
  onCreateDefect: (rect: { x: number; y: number; width: number; height: number }, ruleId: string) => void
  selectedDefectId?: string | null
  onSelectDefect?: (id: string | null) => void
  hiddenTypes?: Set<string>
}

interface Transform {
  offsetX: number
  offsetY: number
  scale: number
}

const MIN_SCALE = 0.1
const MAX_SCALE = 5
const GRID_SIZE = 40

export default function DefectCanvas({
  defects,
  colorRules,
  onCreateDefect,
  selectedDefectId,
  onSelectDefect,
  hiddenTypes = new Set(),
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [tool, setTool] = useState<Tool>("rect")
  const [transform, setTransform] = useState<Transform>({ offsetX: 0, offsetY: 0, scale: 1 })
  const [drawing, setDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 })
  const [pickerPos, setPickerPos] = useState<{
    x: number; y: number
    rect: { x: number; y: number; width: number; height: number }
  } | null>(null)
  const [panStart, setPanStart] = useState<{ x: number; y: number; ox: number; oy: number } | null>(null)

  const colorMap = useRef<Map<string, ColorRule>>(new Map())
  useEffect(() => {
    const m = new Map<string, ColorRule>()
    colorRules.forEach((r) => m.set(r.id, r))
    colorMap.current = m
  }, [colorRules])

  const screenToWorld = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - transform.offsetX) / transform.scale,
      y: (sy - transform.offsetY) / transform.scale,
    }),
    [transform]
  )

  const drawGrid = useCallback(
    (ctx: CanvasRenderingContext2D, w: number, h: number) => {
      ctx.save()
      ctx.strokeStyle = "#3a3a3a"
      ctx.lineWidth = 0.5
      const s = GRID_SIZE * transform.scale
      if (s < 4) { ctx.restore(); return }
      const ox = transform.offsetX % s
      const oy = transform.offsetY % s
      ctx.beginPath()
      for (let x = ox; x < w; x += s) { ctx.moveTo(x, 0); ctx.lineTo(x, h) }
      for (let y = oy; y < h; y += s) { ctx.moveTo(0, y); ctx.lineTo(w, y) }
      ctx.stroke()
      ctx.restore()
    },
    [transform]
  )

  const drawDefects = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      defects.forEach((d) => {
        if (hiddenTypes.has(d.type)) return
        const rule = colorMap.current.get(d.colorRuleId)
        const color = rule?.color ?? "#888"
        const sx = d.posX * transform.scale + transform.offsetX
        const sy = d.posY * transform.scale + transform.offsetY
        const sw = d.width * transform.scale
        const sh = d.height * transform.scale

        ctx.save()
        ctx.fillStyle = color + "40"
        ctx.fillRect(sx, sy, sw, sh)
        ctx.setLineDash([6, 3])
        ctx.strokeStyle = d.id === selectedDefectId ? "#fff" : color
        ctx.lineWidth = d.id === selectedDefectId ? 2.5 : 1.5
        ctx.strokeRect(sx, sy, sw, sh)
        ctx.setLineDash([])

        if (transform.scale > 0.3) {
          const label = d.type
          ctx.font = `${Math.max(11, 12 * transform.scale)}px "Noto Sans SC", sans-serif`
          const tw = ctx.measureText(label).width
          ctx.fillStyle = color
          ctx.fillRect(sx, sy - 20 * transform.scale, tw + 8, 18 * transform.scale)
          ctx.fillStyle = "#fff"
          ctx.fillText(label, sx + 4, sy - 6 * transform.scale)
        }
        ctx.restore()
      })
    },
    [defects, hiddenTypes, selectedDefectId, transform]
  )

  const drawSelectionRect = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (!drawing) return
      const x = Math.min(drawStart.x, drawCurrent.x) * transform.scale + transform.offsetX
      const y = Math.min(drawStart.y, drawCurrent.y) * transform.scale + transform.offsetY
      const w = Math.abs(drawCurrent.x - drawStart.x) * transform.scale
      const h = Math.abs(drawCurrent.y - drawStart.y) * transform.scale
      ctx.save()
      ctx.fillStyle = "rgba(232,119,34,0.15)"
      ctx.fillRect(x, y, w, h)
      ctx.setLineDash([4, 4])
      ctx.strokeStyle = "#E87722"
      ctx.lineWidth = 1.5
      ctx.strokeRect(x, y, w, h)
      ctx.setLineDash([])
      ctx.restore()
    },
    [drawing, drawStart, drawCurrent, transform]
  )

  const render = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.fillStyle = "#1a1a1a"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    drawGrid(ctx, canvas.width, canvas.height)
    drawDefects(ctx)
    drawSelectionRect(ctx)
  }, [drawGrid, drawDefects, drawSelectionRect])

  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return
    const ro = new ResizeObserver(() => {
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
      render()
    })
    ro.observe(container)
    return () => ro.disconnect()
  }, [render])

  useEffect(() => { render() }, [render])

  const getCanvasPos = (e: React.MouseEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasPos(e)
    if (tool === "hand" || e.button === 1) {
      setPanStart({ x: e.clientX, y: e.clientY, ox: transform.offsetX, oy: transform.offsetY })
      return
    }
    if (tool === "rect" && e.button === 0) {
      const world = screenToWorld(pos.x, pos.y)
      setDrawing(true)
      setDrawStart(world)
      setDrawCurrent(world)
      setPickerPos(null)
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (panStart) {
      const dx = e.clientX - panStart.x
      const dy = e.clientY - panStart.y
      setTransform((prev) => ({ ...prev, offsetX: panStart.ox + dx, offsetY: panStart.oy + dy }))
      return
    }
    if (drawing) {
      const pos = getCanvasPos(e)
      const world = screenToWorld(pos.x, pos.y)
      setDrawCurrent(world)
    }
  }

  const handleMouseUp = (e: React.MouseEvent) => {
    if (panStart) { setPanStart(null); return }
    if (drawing && tool === "rect") {
      setDrawing(false)
      const pos = getCanvasPos(e)
      const world = screenToWorld(pos.x, pos.y)
      const x = Math.min(drawStart.x, world.x)
      const y = Math.min(drawStart.y, world.y)
      const width = Math.abs(world.x - drawStart.x)
      const height = Math.abs(world.y - drawStart.y)
      if (width > 5 && height > 5) {
        setPickerPos({ x: pos.x, y: pos.y, rect: { x, y, width, height } })
      }
    }
  }

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault()
    const pos = getCanvasPos(e)
    const factor = e.deltaY < 0 ? 1.1 : 0.9
    setTransform((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor))
      const ratio = newScale / prev.scale
      return {
        scale: newScale,
        offsetX: pos.x - (pos.x - prev.offsetX) * ratio,
        offsetY: pos.y - (pos.y - prev.offsetY) * ratio,
      }
    })
  }

  const handleClick = (e: React.MouseEvent) => {
    if (tool !== "rect" || pickerPos) return
    const pos = getCanvasPos(e)
    const world = screenToWorld(pos.x, pos.y)
    let found: string | null = null
    for (let i = defects.length - 1; i >= 0; i--) {
      const d = defects[i]
      if (hiddenTypes.has(d.type)) continue
      if (world.x >= d.posX && world.x <= d.posX + d.width && world.y >= d.posY && world.y <= d.posY + d.height) {
        found = d.id
        break
      }
    }
    onSelectDefect?.(found)
  }

  const zoomTo = (factor: number) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const cx = canvas.width / 2
    const cy = canvas.height / 2
    setTransform((prev) => {
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prev.scale * factor))
      const ratio = newScale / prev.scale
      return { scale: newScale, offsetX: cx - (cx - prev.offsetX) * ratio, offsetY: cy - (cy - prev.offsetY) * ratio }
    })
  }

  const TOOL_ITEMS: { key: string; icon: typeof Square; label: string }[] = [
    { key: "rect", icon: Square, label: "矩形圈选" },
    { key: "hand", icon: Hand, label: "手型平移" },
    { key: "zi", icon: ZoomIn, label: "放大" },
    { key: "zo", icon: ZoomOut, label: "缩小" },
  ]

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden bg-[#1a1a1a]">
      <div className="pointer-events-none absolute left-0 top-0 z-10 flex w-full items-center justify-center p-3">
        <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-white/10 bg-iron/90 px-2 py-1.5 shadow-lg backdrop-blur">
          {TOOL_ITEMS.map((item) => {
            const active = item.key === tool
            return (
              <button
                key={item.key}
                onClick={() => {
                  if (item.key === "zi") zoomTo(1.3)
                  else if (item.key === "zo") zoomTo(1 / 1.3)
                  else setTool(item.key as Tool)
                }}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs transition-colors",
                  active ? "bg-warn/80 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white"
                )}
                title={item.label}
              >
                <item.icon size={14} />
                <span>{item.label}</span>
              </button>
            )
          })}
          <span className="ml-2 text-xs text-gray-400">{Math.round(transform.scale * 100)}%</span>
        </div>
      </div>

      <canvas
        ref={canvasRef}
        className={cn(
          "absolute inset-0",
          tool === "hand" ? "cursor-grab" : "cursor-crosshair",
          panStart ? "cursor-grabbing" : ""
        )}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => { setPanStart(null); if (drawing) setDrawing(false) }}
        onClick={handleClick}
        onWheel={handleWheel}
        onContextMenu={(e) => e.preventDefault()}
      />

      {pickerPos && (
        <ColorRulePicker
          colorRules={colorRules}
          position={pickerPos}
          onSelect={(ruleId) => { onCreateDefect(pickerPos.rect, ruleId); setPickerPos(null) }}
          onClose={() => setPickerPos(null)}
        />
      )}
    </div>
  )
}

function ColorRulePicker({
  colorRules,
  position,
  onSelect,
  onClose,
}: {
  colorRules: ColorRule[]
  position: { x: number; y: number }
  onSelect: (ruleId: string) => void
  onClose: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose()
    }
    setTimeout(() => document.addEventListener("mousedown", handler), 0)
    return () => document.removeEventListener("mousedown", handler)
  }, [onClose])

  return (
    <div
      ref={ref}
      className="absolute z-20 w-60 rounded-lg border border-white/10 bg-iron/95 p-3 shadow-xl backdrop-blur"
      style={{ left: position.x + 12, top: position.y + 12 }}
    >
      <p className="mb-2 text-xs font-medium text-gray-300">选择颜色规则</p>
      {colorRules.length === 0 ? (
        <p className="py-4 text-center text-xs text-gray-500">暂无规则，请先创建</p>
      ) : (
        <div className="flex max-h-40 flex-col gap-1 overflow-y-auto">
          {colorRules.map((rule) => (
            <button
              key={rule.id}
              onClick={() => onSelect(rule.id)}
              className="flex items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-gray-200 transition-colors hover:bg-white/10"
            >
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: rule.color }} />
              <span className="truncate">{rule.name}</span>
              <span className="ml-auto text-gray-500">{rule.defectCount}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
