import { useRef, useEffect, useMemo } from 'react'
import { useStore } from '@/store/useStore'
import { getSurfaceById } from '@/data/surfaces'
import { computeCrossSection } from '@/utils/crossSection'
import { AlertTriangle, Scissors } from 'lucide-react'

const CANVAS_W = 320
const CANVAS_H = 180

export default function CrossSectionPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const activeSurfaceId = useStore(s => s.activeSurfaceId)
  const params = useStore(s => s.params)
  const crossSectionAxis = useStore(s => s.crossSectionAxis)
  const crossSectionPosition = useStore(s => s.crossSectionPosition)
  const setCrossSectionAxis = useStore(s => s.setCrossSectionAxis)
  const setCrossSectionPosition = useStore(s => s.setCrossSectionPosition)
  const surface = getSurfaceById(activeSurfaceId)

  const crossData = useMemo(() => {
    if (!surface) return null
    return computeCrossSection(surface, params, crossSectionAxis, crossSectionPosition)
  }, [surface, params, crossSectionAxis, crossSectionPosition])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !crossData) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.fillStyle = '#0a0a0f'
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)

    ctx.strokeStyle = '#1a1a2e'
    ctx.lineWidth = 0.5
    ctx.beginPath()
    ctx.moveTo(0, CANVAS_H / 2)
    ctx.lineTo(CANVAS_W, CANVAS_H / 2)
    ctx.moveTo(CANVAS_W / 2, 0)
    ctx.lineTo(CANVAS_W / 2, CANVAS_H)
    ctx.stroke()

    if (crossData.points.length < 2) return

    const xs = crossData.points.map(p => p.x)
    const ys = crossData.points.map(p => p.y)
    const zs = crossData.points.map(p => p.z)
    const allVals = crossSectionAxis === 'x'
      ? [...ys, ...zs]
      : crossSectionAxis === 'y'
      ? [...xs, ...zs]
      : [...xs, ...ys]

    const minV = Math.min(...allVals)
    const maxV = Math.max(...allVals)
    const range = maxV - minV || 1
    const pad = 20

    const mapX = (v: number) => pad + ((v - minV) / range) * (CANVAS_W - 2 * pad)
    const mapY = (v: number) => CANVAS_H - pad - ((v - minV) / range) * (CANVAS_H - 2 * pad)

    const brokenIndices = new Set(crossData.breakIndices)

    ctx.strokeStyle = crossData.status === 'broken' ? '#e05555' : crossData.status === 'misleading' ? '#d4a853' : '#d4a853'
    ctx.lineWidth = 1.5
    ctx.beginPath()

    let prevBroken = false
    for (let i = 0; i < crossData.points.length; i++) {
      const p = crossData.points[i]
      const screenX = crossSectionAxis === 'x' ? mapX(p.y) : mapX(p.x)
      const screenY = crossSectionAxis === 'z' ? mapY(p.z) : crossSectionAxis === 'y' ? mapY(p.z) : mapY(p.y)

      if (brokenIndices.has(i) || prevBroken) {
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(screenX, screenY)
      } else if (i === 0) {
        ctx.moveTo(screenX, screenY)
      } else {
        ctx.lineTo(screenX, screenY)
      }

      prevBroken = brokenIndices.has(i)
    }
    ctx.stroke()

    if (crossData.status !== 'normal') {
      ctx.fillStyle = crossData.status === 'broken' ? '#e05555' : '#d4a853'
      ctx.font = '10px monospace'
      ctx.fillText(crossData.status === 'broken' ? '⚠ 截线断裂' : '⚠ 可能误导', 8, 14)
    }

    ctx.fillStyle = '#e8e6e130'
    ctx.font = '9px monospace'
    const axisLabel = crossSectionAxis === 'x' ? 'Y-Z 截面' : crossSectionAxis === 'y' ? 'X-Z 截面' : 'X-Y 截面'
    ctx.fillText(axisLabel, CANVAS_W - 70, CANVAS_H - 6)
  }, [crossData, crossSectionAxis])

  return (
    <div className="backdrop-blur-xl bg-white/[0.04] border border-white/[0.08] rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-[#e8e6e1] tracking-wide uppercase flex items-center gap-1.5">
          <Scissors className="w-3.5 h-3.5" />
          截线
        </h2>
        {crossData && crossData.status !== 'normal' && (
          <span className={`text-[10px] font-mono flex items-center gap-1 ${
            crossData.status === 'broken' ? 'text-red-400' : 'text-amber-400'
          }`}>
            <AlertTriangle className="w-3 h-3" />
            {crossData.status === 'broken' ? '断裂' : '误导'}
          </span>
        )}
      </div>

      <canvas
        ref={canvasRef}
        width={CANVAS_W}
        height={CANVAS_H}
        className="w-full rounded-md border border-white/[0.06]"
      />

      <div className="flex gap-1.5">
        {(['x', 'y', 'z'] as const).map(axis => (
          <button
            key={axis}
            onClick={() => setCrossSectionAxis(axis)}
            className={`flex-1 text-[10px] py-1 rounded-md font-mono transition-all
              ${crossSectionAxis === axis
                ? 'bg-[#d4a853]/20 text-[#d4a853] border border-[#d4a853]/30'
                : 'bg-white/[0.03] text-[#e8e6e1]/50 border border-white/[0.06] hover:bg-white/[0.06]'
              }`}
          >
            {axis.toUpperCase()} 轴
          </button>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-[#e8e6e1]/50 font-mono">截平面位置</span>
          <span className="text-[10px] font-mono text-[#d4a853]">{crossSectionPosition.toFixed(1)}</span>
        </div>
        <input
          type="range"
          min={-3}
          max={3}
          step={0.1}
          value={crossSectionPosition}
          onChange={e => setCrossSectionPosition(parseFloat(e.target.value))}
          className="w-full h-1 rounded-full appearance-none cursor-pointer
            bg-white/[0.08] accent-[#d4a853]
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-3
            [&::-webkit-slider-thumb]:h-3
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-[#d4a853]
            [&::-webkit-slider-thumb]:cursor-pointer"
        />
      </div>
    </div>
  )
}
