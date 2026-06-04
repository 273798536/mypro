import { useRef, useEffect, useState, useCallback } from 'react'
import { useGameStore } from '@/store/gameStore'
import { cn } from '@/lib/utils'
import { Plus, X, Move, ZoomIn, ZoomOut } from 'lucide-react'

interface FloatingInput {
  x: number
  y: number
  canvasX: number
  canvasY: number
}

interface ContextMenu {
  x: number
  y: number
  pointId: string
}

export default function CalibrationCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const points = useGameStore((s) => s.points)
  const scaleRefs = useGameStore((s) => s.scaleRefs)
  const phase = useGameStore((s) => s.phase)
  const addPoint = useGameStore((s) => s.addPoint)
  const removePoint = useGameStore((s) => s.removePoint)

  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [floatingInput, setFloatingInput] = useState<FloatingInput | null>(null)
  const [labelValue, setLabelValue] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 })

  const screenToCanvas = useCallback(
    (sx: number, sy: number) => ({
      x: (sx - offset.x) / zoom,
      y: (sy - offset.y) / zoom,
    }),
    [offset, zoom]
  )

  const canvasToScreen = useCallback(
    (cx: number, cy: number) => ({
      x: cx * zoom + offset.x,
      y: cy * zoom + offset.y,
    }),
    [offset, zoom]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        setCanvasSize({ width, height })
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = canvasSize.width * dpr
    canvas.height = canvasSize.height * dpr
    canvas.style.width = `${canvasSize.width}px`
    canvas.style.height = `${canvasSize.height}px`
  }, [canvasSize])

  useEffect(() => {
    if (floatingInput && inputRef.current) {
      inputRef.current.focus()
    }
  }, [floatingInput])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)

    ctx.save()
    ctx.translate(offset.x, offset.y)
    ctx.scale(zoom, zoom)

    const gridMinor = 50
    const gridMajor = 200

    const topLeft = screenToCanvas(0, 0)
    const bottomRight = screenToCanvas(canvasSize.width, canvasSize.height)

    const startX = Math.floor(topLeft.x / gridMinor) * gridMinor
    const endX = Math.ceil(bottomRight.x / gridMinor) * gridMinor
    const startY = Math.floor(topLeft.y / gridMinor) * gridMinor
    const endY = Math.ceil(bottomRight.y / gridMinor) * gridMinor

    ctx.lineWidth = 0.5 / zoom
    for (let x = startX; x <= endX; x += gridMinor) {
      const isMajor = x % gridMajor === 0
      ctx.strokeStyle = isMajor ? '#b0b0b0' : '#e5e5e5'
      ctx.lineWidth = isMajor ? 1 / zoom : 0.5 / zoom
      ctx.beginPath()
      ctx.moveTo(x, topLeft.y)
      ctx.lineTo(x, bottomRight.y)
      ctx.stroke()
    }
    for (let y = startY; y <= endY; y += gridMinor) {
      const isMajor = y % gridMajor === 0
      ctx.strokeStyle = isMajor ? '#b0b0b0' : '#e5e5e5'
      ctx.lineWidth = isMajor ? 1 / zoom : 0.5 / zoom
      ctx.beginPath()
      ctx.moveTo(topLeft.x, y)
      ctx.lineTo(bottomRight.x, y)
      ctx.stroke()
    }

    ctx.font = `${11 / zoom}px sans-serif`
    ctx.fillStyle = '#888888'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'top'
    for (let x = startX; x <= endX; x += 100) {
      if (x === 0) continue
      ctx.fillText(String(x), x, 4 / zoom)
    }
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'
    for (let y = startY; y <= endY; y += 100) {
      if (y === 0) continue
      ctx.fillText(String(y), -4 / zoom, y)
    }

    ctx.strokeStyle = '#999999'
    ctx.lineWidth = 1.5 / zoom
    ctx.beginPath()
    ctx.moveTo(topLeft.x, 0)
    ctx.lineTo(bottomRight.x, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, topLeft.y)
    ctx.lineTo(0, bottomRight.y)
    ctx.stroke()

    for (const ref of scaleRefs) {
      ctx.strokeStyle = '#3b82f6'
      ctx.lineWidth = 2 / zoom
      ctx.beginPath()
      ctx.moveTo(ref.startX, ref.startY)
      ctx.lineTo(ref.endX, ref.endY)
      ctx.stroke()

      const mx = (ref.startX + ref.endX) / 2
      const my = (ref.startY + ref.endY) / 2
      ctx.font = `bold ${12 / zoom}px sans-serif`
      ctx.fillStyle = '#3b82f6'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(`${ref.realDistance}${ref.unit}`, mx, my - 4 / zoom)

      const arrowSize = 6 / zoom
      const angle = Math.atan2(ref.endY - ref.startY, ref.endX - ref.startX)
      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.moveTo(ref.endX, ref.endY)
      ctx.lineTo(
        ref.endX - arrowSize * Math.cos(angle - Math.PI / 6),
        ref.endY - arrowSize * Math.sin(angle - Math.PI / 6)
      )
      ctx.lineTo(
        ref.endX - arrowSize * Math.cos(angle + Math.PI / 6),
        ref.endY - arrowSize * Math.sin(angle + Math.PI / 6)
      )
      ctx.closePath()
      ctx.fill()
    }

    for (const point of points) {
      if (point.coordinateReversed) {
        ctx.strokeStyle = '#f97316'
        ctx.lineWidth = 2 / zoom
        ctx.setLineDash([4 / zoom, 3 / zoom])
        ctx.beginPath()
        ctx.arc(point.x, point.y, 10 / zoom, 0, Math.PI * 2)
        ctx.stroke()
        ctx.setLineDash([])
      }

      ctx.fillStyle = '#ef4444'
      ctx.beginPath()
      ctx.arc(point.x, point.y, 6 / zoom, 0, Math.PI * 2)
      ctx.fill()

      ctx.font = `${12 / zoom}px sans-serif`
      ctx.fillStyle = '#1f2937'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'bottom'
      ctx.fillText(point.label, point.x, point.y - 10 / zoom)
    }

    ctx.restore()
  }, [canvasSize, offset, zoom, points, scaleRefs, screenToCanvas])

  const findPointAt = useCallback(
    (canvasX: number, canvasY: number) => {
      const hitRadius = 12 / zoom
      for (let i = points.length - 1; i >= 0; i--) {
        const p = points[i]
        const dx = canvasX - p.x
        const dy = canvasY - p.y
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          return p
        }
      }
      return null
    },
    [points, zoom]
  )

  const handleMouseDown = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (e.button === 1 || (e.button === 0 && e.altKey)) {
        setIsPanning(true)
        setPanStart({ x: e.clientX - offset.x, y: e.clientY - offset.y })
        return
      }

      if (e.button === 2) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        const { x: cx, y: cy } = screenToCanvas(sx, sy)
        const hit = findPointAt(cx, cy)
        if (hit) {
          setContextMenu({ x: e.clientX, y: e.clientY, pointId: hit.id })
        }
        return
      }

      if (e.button === 0) {
        const rect = canvasRef.current?.getBoundingClientRect()
        if (!rect) return
        const sx = e.clientX - rect.left
        const sy = e.clientY - rect.top
        const { x: cx, y: cy } = screenToCanvas(sx, sy)

        const hit = findPointAt(cx, cy)
        if (hit) {
          setContextMenu({ x: e.clientX, y: e.clientY, pointId: hit.id })
          return
        }

        if (phase === 'running') {
          const screen = canvasToScreen(cx, cy)
          setFloatingInput({ x: screen.x, y: screen.y, canvasX: cx, canvasY: cy })
          setLabelValue('')
        }
      }
    },
    [offset, screenToCanvas, canvasToScreen, findPointAt, phase]
  )

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!isPanning) return
      setOffset({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    },
    [isPanning, panStart]
  )

  const handleMouseUp = useCallback(() => {
    setIsPanning(false)
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent<HTMLCanvasElement>) => {
      e.preventDefault()
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const sx = e.clientX - rect.left
      const sy = e.clientY - rect.top

      const factor = e.deltaY < 0 ? 1.1 : 0.9
      const newZoom = Math.min(Math.max(zoom * factor, 0.1), 10)

      setOffset({
        x: sx - (sx - offset.x) * (newZoom / zoom),
        y: sy - (sy - offset.y) * (newZoom / zoom),
      })
      setZoom(newZoom)
    },
    [zoom, offset]
  )

  const handleInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter' && floatingInput && labelValue.trim()) {
        addPoint(floatingInput.canvasX, floatingInput.canvasY, labelValue.trim())
        setFloatingInput(null)
        setLabelValue('')
      } else if (e.key === 'Escape') {
        setFloatingInput(null)
        setLabelValue('')
      }
    },
    [floatingInput, labelValue, addPoint]
  )

  const handleRemovePoint = useCallback(
    (pointId: string) => {
      removePoint(pointId)
      setContextMenu(null)
    },
    [removePoint]
  )

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
  }, [])

  const handleResetView = useCallback(() => {
    setOffset({ x: 0, y: 0 })
    setZoom(1)
  }, [])

  const handleZoomIn = useCallback(() => {
    const cx = canvasSize.width / 2
    const cy = canvasSize.height / 2
    const newZoom = Math.min(zoom * 1.2, 10)
    setOffset({
      x: cx - (cx - offset.x) * (newZoom / zoom),
      y: cy - (cy - offset.y) * (newZoom / zoom),
    })
    setZoom(newZoom)
  }, [zoom, offset, canvasSize])

  const handleZoomOut = useCallback(() => {
    const cx = canvasSize.width / 2
    const cy = canvasSize.height / 2
    const newZoom = Math.max(zoom * 0.8, 0.1)
    setOffset({
      x: cx - (cx - offset.x) * (newZoom / zoom),
      y: cy - (cy - offset.y) * (newZoom / zoom),
    })
    setZoom(newZoom)
  }, [zoom, offset, canvasSize])

  useEffect(() => {
    const handleClickOutside = () => setContextMenu(null)
    if (contextMenu) {
      window.addEventListener('click', handleClickOutside)
      return () => window.removeEventListener('click', handleClickOutside)
    }
  }, [contextMenu])

  return (
    <div
      ref={containerRef}
      className={cn('relative h-full w-full overflow-hidden bg-white')}
      onContextMenu={handleContextMenu}
    >
      <canvas
        ref={canvasRef}
        className={cn('block cursor-crosshair', isPanning && 'cursor-grabbing')}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {phase === 'running' && (
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded bg-green-100 px-2 py-1 text-xs text-green-700">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-green-500" />
          校对中
        </div>
      )}

      <div className="absolute bottom-3 right-3 flex items-center gap-1">
        <button
          onClick={handleZoomOut}
          className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white shadow-sm hover:bg-gray-50"
        >
          <ZoomOut size={14} />
        </button>
        <span className="min-w-[4rem] text-center text-xs text-gray-500">
          {Math.round(zoom * 100)}%
        </span>
        <button
          onClick={handleZoomIn}
          className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white shadow-sm hover:bg-gray-50"
        >
          <ZoomIn size={14} />
        </button>
        <button
          onClick={handleResetView}
          className="flex h-8 w-8 items-center justify-center rounded border border-gray-300 bg-white shadow-sm hover:bg-gray-50"
        >
          <Move size={14} />
        </button>
      </div>

      {floatingInput && (
        <div
          className="absolute z-10 flex items-center gap-1"
          style={{ left: floatingInput.x, top: floatingInput.y - 16 }}
        >
          <div className="flex items-center gap-1 rounded border border-blue-400 bg-white px-1.5 py-0.5 shadow-md">
            <Plus size={12} className="text-blue-500" />
            <input
              ref={inputRef}
              type="text"
              value={labelValue}
              onChange={(e) => setLabelValue(e.target.value)}
              onKeyDown={handleInputKeyDown}
              onBlur={() => {
                setFloatingInput(null)
                setLabelValue('')
              }}
              placeholder="标注名称"
              className="w-24 border-none bg-transparent text-xs outline-none placeholder:text-gray-400"
            />
          </div>
        </div>
      )}

      {contextMenu && (
        <div
          className="absolute z-20 rounded border border-gray-200 bg-white py-1 shadow-lg"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => handleRemovePoint(contextMenu.pointId)}
            className="flex w-full items-center gap-2 px-3 py-1.5 text-xs text-red-600 hover:bg-red-50"
          >
            <X size={12} />
            删除标注点
          </button>
        </div>
      )}
    </div>
  )
}
