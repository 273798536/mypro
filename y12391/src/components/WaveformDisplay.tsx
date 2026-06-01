import { useRef, useEffect, useState, useCallback } from 'react'

interface WaveformDisplayProps {
  data: number[]
  envelopeData?: number[]
  sampleRate: number
  width?: number
  height?: number
}

export default function WaveformDisplay({
  data,
  envelopeData,
  sampleRate,
  width: propWidth,
  height: propHeight = 200,
}: WaveformDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [canvasWidth, setCanvasWidth] = useState(propWidth ?? 800)
  const [scaleX, setScaleX] = useState(1)
  const [offsetX, setOffsetX] = useState(0)
  const isDragging = useRef(false)
  const lastX = useRef(0)

  useEffect(() => {
    if (propWidth !== undefined) return
    const container = containerRef.current
    if (!container) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(Math.floor(entry.contentRect.width))
      }
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [propWidth])

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || data.length === 0) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    const midY = h / 2
    const padding = 30

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, w, h)

    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 0.5
    const gridSpacingX = 50
    const gridSpacingY = 30
    for (let x = 0; x < w; x += gridSpacingX) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, h)
      ctx.stroke()
    }
    for (let y = 0; y < h; y += gridSpacingY) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(w, y)
      ctx.stroke()
    }

    const visibleSamples = Math.floor(data.length / scaleX)
    const startSample = Math.max(0, Math.min(Math.floor(offsetX), data.length - visibleSamples))

    const timeToX = (sampleIndex: number) =>
      padding + ((sampleIndex - startSample) / visibleSamples) * (w - padding * 2)
    const ampToY = (amp: number) => midY - amp * (midY - padding)

    ctx.strokeStyle = '#00ff88'
    ctx.lineWidth = 1
    ctx.beginPath()
    const step = Math.max(1, Math.floor(visibleSamples / (w - padding * 2)))
    for (let i = startSample; i < startSample + visibleSamples && i < data.length; i += step) {
      const x = timeToX(i)
      const y = ampToY(data[i])
      if (i === startSample) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()

    if (envelopeData && envelopeData.length > 0) {
      ctx.save()
      ctx.globalAlpha = 0.7
      ctx.strokeStyle = '#44aaff'
      ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = startSample; i < startSample + visibleSamples && i < envelopeData.length; i += step) {
        const x = timeToX(i)
        const y = ampToY(envelopeData[i])
        if (i === startSample) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
      ctx.restore()
    }

    ctx.fillStyle = '#888888'
    ctx.font = '10px monospace'
    ctx.textAlign = 'center'
    const labelCount = 6
    for (let i = 0; i <= labelCount; i++) {
      const sampleIndex = startSample + (visibleSamples * i) / labelCount
      const time = sampleIndex / sampleRate
      const x = padding + ((w - padding * 2) * i) / labelCount
      ctx.fillText(`${time.toFixed(2)}s`, x, h - 4)
    }

    ctx.textAlign = 'right'
    const ampLabels = [1, 0.5, 0, -0.5, -1]
    for (const amp of ampLabels) {
      const y = ampToY(amp)
      ctx.fillText(amp.toFixed(1), padding - 4, y + 3)
    }
  }, [data, envelopeData, sampleRate, canvasWidth, propHeight, scaleX, offsetX])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = canvasWidth
    canvas.height = propHeight
    draw()
  }, [draw, canvasWidth, propHeight])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setScaleX((prev) => {
      const next = e.deltaY < 0 ? prev * 1.2 : prev / 1.2
      return Math.max(1, Math.min(next, data.length / 10))
    })
  }, [data.length])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true
    lastX.current = e.clientX
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return
    const dx = e.clientX - lastX.current
    lastX.current = e.clientX
    setOffsetX((prev) => {
      const samplesPerPixel = data.length / scaleX / canvasWidth
      const delta = -dx * samplesPerPixel
      return Math.max(0, Math.min(prev + delta, data.length - data.length / scaleX))
    })
  }, [data.length, scaleX, canvasWidth])

  const handleMouseUp = useCallback(() => {
    isDragging.current = false
  }, [])

  return (
    <div ref={containerRef} className="relative w-full rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        className="block w-full cursor-grab active:cursor-grabbing"
        style={{ height: propHeight }}
      />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)',
        }}
      />
    </div>
  )
}
