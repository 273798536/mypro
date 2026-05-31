import { useState, useCallback, useRef } from 'react'
import type { CurveSegment } from '@/types'

interface CurveCanvasProps {
  curve: CurveSegment[]
  onPointDrag: (segmentId: string, pointIndex: number, newY: number) => void
  isInverted: boolean
}

const SVG_W = 800
const SVG_H = 500
const MARGIN = { top: 20, right: 20, bottom: 40, left: 60 }
const PLOT_W = SVG_W - MARGIN.left - MARGIN.right
const PLOT_H = SVG_H - MARGIN.top - MARGIN.bottom

const X_MIN = 0
const X_MAX = 30
const Y_MIN = 0
const Y_MAX = 8

const toSvgX = (x: number) => MARGIN.left + ((x - X_MIN) / (X_MAX - X_MIN)) * PLOT_W
const toSvgY = (y: number) => MARGIN.top + PLOT_H - ((y - Y_MIN) / (Y_MAX - Y_MIN)) * PLOT_H
const toDataY = (svgY: number) => Y_MIN + ((MARGIN.top + PLOT_H - svgY) / PLOT_H) * (Y_MAX - Y_MIN)

function catmullRomToBezier(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) {
    return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`
  }

  const extended = [
    { x: 2 * points[0].x - points[1].x, y: 2 * points[0].y - points[1].y },
    ...points,
    { x: 2 * points[points.length - 1].x - points[points.length - 2].x, y: 2 * points[points.length - 1].y - points[points.length - 2].y },
  ]

  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < extended.length - 2; i++) {
    const p0 = extended[i - 1]
    const p1 = extended[i]
    const p2 = extended[i + 1]
    const p3 = extended[i + 2]

    const cp1x = p1.x + (p2.x - p0.x) / 6
    const cp1y = p1.y + (p2.y - p0.y) / 6
    const cp2x = p2.x - (p3.x - p1.x) / 6
    const cp2y = p2.y - (p3.y - p1.y) / 6

    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
  }

  return d
}

const GRID_LINES_X = [0, 5, 10, 15, 20, 25, 30]
const GRID_LINES_Y = [0, 1, 2, 3, 4, 5, 6, 7, 8]

export default function CurveCanvas({ curve, onPointDrag, isInverted }: CurveCanvasProps) {
  const [dragging, setDragging] = useState<{ segmentId: string; pointIndex: number } | null>(null)
  const [hovered, setHovered] = useState<{ segmentId: string; pointIndex: number } | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)

  const clampY = useCallback((raw: number) => {
    const clamped = Math.max(Y_MIN, Math.min(Y_MAX, raw))
    return Math.round(clamped * 100) / 100
  }, [])

  const handlePointerDown = useCallback(
    (segmentId: string, pointIndex: number, e: React.PointerEvent<SVGCircleElement>) => {
      e.preventDefault()
      ;(e.target as SVGCircleElement).setPointerCapture(e.pointerId)
      setDragging({ segmentId, pointIndex })
    },
    [],
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!dragging || !svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      const scaleY = SVG_H / rect.height
      const svgY = (e.clientY - rect.top) * scaleY
      const dataY = clampY(toDataY(svgY))
      onPointDrag(dragging.segmentId, dragging.pointIndex, dataY)
    },
    [dragging, onPointDrag, clampY],
  )

  const handlePointerUp = useCallback(() => {
    setDragging(null)
  }, [])

  const allPoints = curve.flatMap((seg) => seg.points)
  const svgPoints = allPoints.map((p) => ({ x: toSvgX(p.x), y: toSvgY(p.y) }))
  const curvePath = catmullRomToBezier(svgPoints)

  return (
    <svg
      ref={svgRef}
      width={SVG_W}
      height={SVG_H}
      viewBox={`0 0 ${SVG_W} ${SVG_H}`}
      className="select-none"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <defs>
        <linearGradient id="curveGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F0C850" />
          <stop offset="100%" stopColor="#A67C00" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="pointGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#F0C850" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#F0C850" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width={SVG_W} height={SVG_H} fill="#0A1628" rx="8" />

      {GRID_LINES_X.map((xVal) => (
        <line
          key={`gx-${xVal}`}
          x1={toSvgX(xVal)}
          y1={MARGIN.top}
          x2={toSvgX(xVal)}
          y2={MARGIN.top + PLOT_H}
          stroke="#1B2A4A"
          strokeWidth={1}
        />
      ))}
      {GRID_LINES_Y.map((yVal) => (
        <line
          key={`gy-${yVal}`}
          x1={MARGIN.left}
          y1={toSvgY(yVal)}
          x2={MARGIN.left + PLOT_W}
          y2={toSvgY(yVal)}
          stroke="#1B2A4A"
          strokeWidth={1}
        />
      ))}

      <line
        x1={MARGIN.left}
        y1={toSvgY(0)}
        x2={MARGIN.left + PLOT_W}
        y2={toSvgY(0)}
        stroke="#2C3E6B"
        strokeWidth={1.5}
      />
      <line
        x1={MARGIN.left}
        y1={MARGIN.top}
        x2={MARGIN.left}
        y2={MARGIN.top + PLOT_H}
        stroke="#2C3E6B"
        strokeWidth={1.5}
      />

      {GRID_LINES_X.map((xVal) => (
        <text
          key={`lx-${xVal}`}
          x={toSvgX(xVal)}
          y={MARGIN.top + PLOT_H + 24}
          textAnchor="middle"
          fill="#5A6E8A"
          fontSize="11"
        >
          {xVal}Y
        </text>
      ))}
      {GRID_LINES_Y.map((yVal) => (
        <text
          key={`ly-${yVal}`}
          x={MARGIN.left - 8}
          y={toSvgY(yVal) + 4}
          textAnchor="end"
          fill="#5A6E8A"
          fontSize="11"
        >
          {yVal}%
        </text>
      ))}

      <text
        x={MARGIN.left + PLOT_W / 2}
        y={SVG_H - 4}
        textAnchor="middle"
        fill="#5A6E8A"
        fontSize="12"
      >
        期限（年）
      </text>
      <text
        x={14}
        y={MARGIN.top + PLOT_H / 2}
        textAnchor="middle"
        fill="#5A6E8A"
        fontSize="12"
        transform={`rotate(-90, 14, ${MARGIN.top + PLOT_H / 2})`}
      >
        收益率（%）
      </text>

      {curvePath && (
        <path
          d={curvePath}
          fill="none"
          stroke="url(#curveGradient)"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}

      {curve.map((seg) =>
        seg.points.map((pt, pi) => {
          const isDragging = dragging?.segmentId === seg.id && dragging?.pointIndex === pi
          const isHovered = hovered?.segmentId === seg.id && hovered?.pointIndex === pi
          const svgX = toSvgX(pt.x)
          const svgY = toSvgY(pt.y)
          const showTooltip = isHovered || isDragging

          if (pt.locked) {
            return (
              <g key={`${seg.id}-${pi}`}>
                <circle cx={svgX} cy={svgY} r={4} fill="#78909C" stroke="#546E7A" strokeWidth={1} />
              </g>
            )
          }

          const radius = isDragging ? 11 : isHovered ? 9 : 7

          return (
            <g key={`${seg.id}-${pi}`}>
              {isDragging && (
                <circle cx={svgX} cy={svgY} r={22} fill="url(#pointGlow)" pointerEvents="none" />
              )}
              <circle
                cx={svgX}
                cy={svgY}
                r={radius}
                fill={isDragging ? '#F0C850' : '#D4A017'}
                stroke={isDragging ? '#F0C850' : '#A67C00'}
                strokeWidth={isDragging ? 2 : 1.5}
                filter={isDragging ? 'url(#glow)' : undefined}
                style={{ cursor: 'grab' }}
                onPointerDown={(e) => handlePointerDown(seg.id, pi, e)}
                onPointerEnter={() => setHovered({ segmentId: seg.id, pointIndex: pi })}
                onPointerLeave={() => setHovered(null)}
              />
              {showTooltip && (
                <g>
                  <rect
                    x={svgX - 42}
                    y={svgY - 36}
                    width={84}
                    height={24}
                    rx={4}
                    fill="#1A2744"
                    stroke="#2C3E6B"
                    strokeWidth={1}
                    opacity={0.92}
                  />
                  <text
                    x={svgX}
                    y={svgY - 20}
                    textAnchor="middle"
                    fill="#E0E6ED"
                    fontSize="11"
                  >
                    {pt.x}Y / {pt.y.toFixed(2)}%
                  </text>
                </g>
              )}
            </g>
          )
        }),
      )}

      {isInverted && (
        <g className="animate-pulse">
          <rect
            x={SVG_W - 132}
            y={8}
            width={124}
            height={28}
            rx={6}
            fill="#B71C1C"
            opacity={0.9}
          />
          <text
            x={SVG_W - 70}
            y={27}
            textAnchor="middle"
            fill="#FFCDD2"
            fontSize="13"
            fontWeight="bold"
          >
            ⚠ 曲线反向
          </text>
        </g>
      )}
    </svg>
  )
}
