import type { SegmentResult, DataPoint } from '@/store/regression'

interface RegressionChartProps {
  segments: SegmentResult[]
  breakpoints: number[]
  data: DataPoint[]
  width?: number
  height?: number
}

const SEGMENT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const MARGIN = { top: 30, right: 30, bottom: 50, left: 60 }

function niceScale(min: number, max: number, ticks: number = 6) {
  const range = max - min
  if (range === 0) return { min: min - 1, max: max + 1, step: 1 }
  const roughStep = range / ticks
  const magnitude = Math.pow(10, Math.floor(Math.log10(roughStep)))
  const residual = roughStep / magnitude
  let niceStep: number
  if (residual <= 1.5) niceStep = magnitude
  else if (residual <= 3) niceStep = 2 * magnitude
  else if (residual <= 7) niceStep = 5 * magnitude
  else niceStep = 10 * magnitude
  const niceMin = Math.floor(min / niceStep) * niceStep
  const niceMax = Math.ceil(max / niceStep) * niceStep
  return { min: niceMin, max: niceMax, step: niceStep }
}

export default function RegressionChart({
  segments,
  breakpoints,
  data,
  width = 800,
  height = 500,
}: RegressionChartProps) {
  const allX = data.map(d => d.x)
  const allY = data.map(d => d.y)
  if (allX.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        No data to display
      </div>
    )
  }

  const xScale = niceScale(Math.min(...allX), Math.max(...allX))
  const yScale = niceScale(Math.min(...allY), Math.max(...allY))

  const plotW = width - MARGIN.left - MARGIN.right
  const plotH = height - MARGIN.top - MARGIN.bottom

  const scaleX = (v: number) => MARGIN.left + ((v - xScale.min) / (xScale.max - xScale.min)) * plotW
  const scaleY = (v: number) => MARGIN.top + plotH - ((v - yScale.min) / (yScale.max - yScale.min)) * plotH

  const xTicks: number[] = []
  for (let v = xScale.min; v <= xScale.max + xScale.step * 0.5; v += xScale.step) {
    xTicks.push(Math.round(v * 1e10) / 1e10)
  }

  const yTicks: number[] = []
  for (let v = yScale.min; v <= yScale.max + yScale.step * 0.5; v += yScale.step) {
    yTicks.push(Math.round(v * 1e10) / 1e10)
  }

  const boundarySet = new Set<string>()
  segments.forEach(seg => {
    seg.boundarySamples.forEach(bp => {
      boundarySet.add(`${bp.x},${bp.y}`)
    })
  })

  const formatNum = (n: number) => {
    if (Math.abs(n) >= 1e6 || (Math.abs(n) < 0.001 && n !== 0)) return n.toExponential(1)
    if (Number.isInteger(n)) return n.toString()
    return n.toPrecision(4).replace(/\.?0+$/, '')
  }

  return (
    <div className="w-full overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto max-w-full"
        style={{ fontFamily: 'inherit' }}
      >
        <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} fill="#fafafa" rx={2} />

        {yTicks.map(v => (
          <line
            key={`yg-${v}`}
            x1={MARGIN.left}
            y1={scaleY(v)}
            x2={MARGIN.left + plotW}
            y2={scaleY(v)}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}
        {xTicks.map(v => (
          <line
            key={`xg-${v}`}
            x1={scaleX(v)}
            y1={MARGIN.top}
            x2={scaleX(v)}
            y2={MARGIN.top + plotH}
            stroke="#e5e7eb"
            strokeWidth={0.5}
          />
        ))}

        <line
          x1={MARGIN.left}
          y1={MARGIN.top + plotH}
          x2={MARGIN.left + plotW}
          y2={MARGIN.top + plotH}
          stroke="#9ca3af"
          strokeWidth={1.5}
        />
        <line
          x1={MARGIN.left}
          y1={MARGIN.top}
          x2={MARGIN.left}
          y2={MARGIN.top + plotH}
          stroke="#9ca3af"
          strokeWidth={1.5}
        />

        {xTicks.map(v => (
          <g key={`xt-${v}`}>
            <line x1={scaleX(v)} y1={MARGIN.top + plotH} x2={scaleX(v)} y2={MARGIN.top + plotH + 6} stroke="#9ca3af" strokeWidth={1} />
            <text x={scaleX(v)} y={MARGIN.top + plotH + 20} textAnchor="middle" fontSize={11} fill="#6b7280">
              {formatNum(v)}
            </text>
          </g>
        ))}
        {yTicks.map(v => (
          <g key={`yt-${v}`}>
            <line x1={MARGIN.left - 6} y1={scaleY(v)} x2={MARGIN.left} y2={scaleY(v)} stroke="#9ca3af" strokeWidth={1} />
            <text x={MARGIN.left - 10} y={scaleY(v) + 4} textAnchor="end" fontSize={11} fill="#6b7280">
              {formatNum(v)}
            </text>
          </g>
        ))}

        <clipPath id="plotClip">
          <rect x={MARGIN.left} y={MARGIN.top} width={plotW} height={plotH} />
        </clipPath>

        <g clipPath="url(#plotClip)">
          {data.map((d, i) => {
            const isBoundary = boundarySet.has(`${d.x},${d.y}`)
            return (
              <circle
                key={`dp-${i}`}
                cx={scaleX(d.x)}
                cy={scaleY(d.y)}
                r={isBoundary ? 5 : 3}
                fill={isBoundary ? '#fff7ed' : '#d1d5db'}
                stroke={isBoundary ? '#f97316' : '#9ca3af'}
                strokeWidth={isBoundary ? 2 : 0.5}
              />
            )
          })}

          {segments.map((seg, i) => {
            const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
            const x1 = scaleX(seg.startX)
            const y1 = scaleY(seg.slope * seg.startX + seg.intercept)
            const x2 = scaleX(seg.endX)
            const y2 = scaleY(seg.slope * seg.endX + seg.intercept)
            const midX = (x1 + x2) / 2
            const midY = (y1 + y2) / 2

            return (
              <g key={`seg-${i}`}>
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={2.5} />
                {seg.unit && (
                  <text
                    x={midX + 4}
                    y={midY - 8}
                    fontSize={10}
                    fill={color}
                    fontWeight={600}
                  >
                    {seg.unit}
                  </text>
                )}
                {seg.unitMissing && (
                  <g transform={`translate(${midX + 4}, ${midY + 10})`}>
                    <text fontSize={12} fill="#dc2626" fontWeight={700}>⚠ No unit</text>
                  </g>
                )}
              </g>
            )
          })}
        </g>

        {breakpoints.map((bp, i) => {
          const x = scaleX(bp)
          return (
            <g key={`bp-${i}`}>
              <line
                x1={x}
                y1={MARGIN.top}
                x2={x}
                y2={MARGIN.top + plotH}
                stroke="#dc2626"
                strokeWidth={1.5}
                strokeDasharray="6,4"
              />
              <rect
                x={x - 28}
                y={MARGIN.top - 22}
                width={56}
                height={18}
                rx={3}
                fill="#dc2626"
              />
              <text
                x={x}
                y={MARGIN.top - 9}
                textAnchor="middle"
                fontSize={10}
                fill="#fff"
                fontWeight={600}
              >
                {formatNum(bp)}
              </text>
            </g>
          )
        })}

        <text
          x={MARGIN.left + plotW / 2}
          y={height - 6}
          textAnchor="middle"
          fontSize={12}
          fill="#4b5563"
          fontWeight={500}
        >
          X
        </text>
        <text
          x={14}
          y={MARGIN.top + plotH / 2}
          textAnchor="middle"
          fontSize={12}
          fill="#4b5563"
          fontWeight={500}
          transform={`rotate(-90, 14, ${MARGIN.top + plotH / 2})`}
        >
          Y
        </text>

        <g transform={`translate(${MARGIN.left + 8}, ${MARGIN.top + 8})`}>
          <rect x={0} y={0} width={160} height={segments.length * 22 + 10} rx={4} fill="white" fillOpacity={0.9} stroke="#e5e7eb" strokeWidth={0.5} />
          {segments.map((seg, i) => {
            const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length]
            return (
              <g key={`legend-${i}`} transform={`translate(8, ${i * 22 + 14})`}>
                <line x1={0} y1={0} x2={18} y2={0} stroke={color} strokeWidth={2.5} />
                <text x={24} y={4} fontSize={10} fill="#374151">
                  Seg {i + 1}: R² = {seg.r2.toFixed(3)}
                </text>
              </g>
            )
          })}
        </g>
      </svg>
    </div>
  )
}
