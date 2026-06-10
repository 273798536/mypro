import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { HeatmapChartProps, HeatmapCellData } from '@/types'
import { cn } from '@/lib/utils'
import HeatmapTooltip from './HeatmapTooltip'
import ColorLegend from './ColorLegend'

const COLOR_STOPS = [
  { offset: 0, r: 30, g: 58, b: 95 },
  { offset: 0.25, r: 37, g: 99, b: 235 },
  { offset: 0.5, r: 34, g: 211, b: 238 },
  { offset: 0.75, r: 250, g: 204, b: 21 },
  { offset: 1, r: 239, g: 68, b: 68 },
]

function getColorForValue(value: number, min: number, max: number): string {
  if (max === min) return `rgb(${COLOR_STOPS[0].r}, ${COLOR_STOPS[0].g}, ${COLOR_STOPS[0].b})`

  const normalized = (value - min) / (max - min)
  const clamped = Math.max(0, Math.min(1, normalized))

  for (let i = 0; i < COLOR_STOPS.length - 1; i++) {
    const start = COLOR_STOPS[i]
    const end = COLOR_STOPS[i + 1]

    if (clamped >= start.offset && clamped <= end.offset) {
      const range = end.offset - start.offset
      const t = (clamped - start.offset) / range
      const r = Math.round(start.r + (end.r - start.r) * t)
      const g = Math.round(start.g + (end.g - start.g) * t)
      const b = Math.round(start.b + (end.b - start.b) * t)
      return `rgb(${r}, ${g}, ${b})`
    }
  }

  return `rgb(${COLOR_STOPS[COLOR_STOPS.length - 1].r}, ${COLOR_STOPS[COLOR_STOPS.length - 1].g}, ${COLOR_STOPS[COLOR_STOPS.length - 1].b})`
}

export default function HeatmapChart({
  data,
  microbes,
  samples,
  onCellClick,
  onCellHover,
  selectedSample,
  selectedMicrobe,
}: HeatmapChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredCell, setHoveredCell] = useState<HeatmapCellData | null>(null)
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 })
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 })

  const cellWidth = 32
  const cellHeight = 28
  const rowLabelWidth = 140
  const colLabelHeight = 80
  const legendHeight = 60

  const { minValue, maxValue, dataMap } = useMemo(() => {
    let min = Infinity
    let max = -Infinity
    const map = new Map<string, number | null>()

    data.forEach((item) => {
      const key = `${item.sampleId}-${item.microbeId}`
      map.set(key, item.abundance)
      if (item.abundance !== null && item.abundance !== undefined) {
        if (item.abundance < min) min = item.abundance
        if (item.abundance > max) max = item.abundance
      }
    })

    return {
      minValue: min === Infinity ? 0 : min,
      maxValue: max === -Infinity ? 1 : max,
      dataMap: map,
    }
  }, [data])

  const sampleMap = useMemo(() => {
    const map = new Map<string, string>()
    samples.forEach((s) => map.set(s.id, s.name))
    return map
  }, [samples])

  const microbeMap = useMemo(() => {
    const map = new Map<string, string>()
    microbes.forEach((m) => map.set(m.id, m.name))
    return map
  }, [microbes])

  useEffect(() => {
    if (!containerRef.current) return

    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setContainerSize({
          width: rect.width,
          height: rect.height,
        })
      }
    }

    updateSize()

    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(containerRef.current)

    return () => resizeObserver.disconnect()
  }, [])

  const svgWidth = useMemo(() => {
    return Math.max(
      rowLabelWidth + samples.length * cellWidth + 40,
      containerSize.width - 40
    )
  }, [samples.length, containerSize.width])

  const svgHeight = useMemo(() => {
    return colLabelHeight + microbes.length * cellHeight + legendHeight + 40
  }, [microbes.length])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGRectElement>, cellData: HeatmapCellData) => {
      if (!svgRef.current) return
      const rect = svgRef.current.getBoundingClientRect()
      setTooltipPosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      })
    },
    []
  )

  const handleCellHover = useCallback(
    (cellData: HeatmapCellData | null) => {
      setHoveredCell(cellData)
      onCellHover?.(cellData)
    },
    [onCellHover]
  )

  const handleCellClick = useCallback(
    (cellData: HeatmapCellData) => {
      onCellClick?.(cellData)
    },
    [onCellClick]
  )

  const isCellHighlighted = useCallback(
    (sampleId: string, microbeId: string) => {
      if (!selectedSample && !selectedMicrobe) return true
      if (selectedSample && sampleId === selectedSample) return true
      if (selectedMicrobe && microbeId === selectedMicrobe) return true
      return false
    },
    [selectedSample, selectedMicrobe]
  )

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-auto">
      <div className="p-4 min-w-full">
        <svg
          ref={svgRef}
          width={svgWidth}
          height={svgHeight}
          className="overflow-visible"
        >
          <g transform={`translate(${rowLabelWidth}, 0)`}>
            {samples.map((sample, colIndex) => {
              const x = colIndex * cellWidth + cellWidth / 2
              const isSelected = selectedSample === sample.id
              return (
                <g key={sample.id}>
                  <text
                    x={x}
                    y={colLabelHeight - 10}
                    textAnchor="end"
                    transform={`rotate(-45, ${x}, ${colLabelHeight - 10})`}
                    className={cn(
                      'text-xs fill-lab-300 transition-colors duration-200',
                      isSelected && 'fill-teal-400 font-medium'
                    )}
                    style={{ fontSize: '11px' }}
                  >
                    {sample.name}
                  </text>
                </g>
              )
            })}
          </g>

          <g transform={`translate(0, ${colLabelHeight})`}>
            {microbes.map((microbe, rowIndex) => {
              const y = rowIndex * cellHeight + cellHeight / 2
              const isSelected = selectedMicrobe === microbe.id
              return (
                <g key={microbe.id}>
                  <text
                    x={rowLabelWidth - 10}
                    y={y + 4}
                    textAnchor="end"
                    className={cn(
                      'fill-lab-300 transition-colors duration-200',
                      isSelected && 'fill-teal-400 font-medium'
                    )}
                    style={{ fontSize: '11px' }}
                  >
                    {microbe.name}
                  </text>
                </g>
              )
            })}
          </g>

          <g transform={`translate(${rowLabelWidth}, ${colLabelHeight})`}>
            {microbes.map((microbe, rowIndex) =>
              samples.map((sample, colIndex) => {
                const key = `${sample.id}-${microbe.id}`
                const rawAbundance = dataMap.get(key)
                const abundance = rawAbundance ?? 0
                const isMissing = rawAbundance === null || rawAbundance === undefined
                const relativeAbundance = data.find(
                  (d) => d.sampleId === sample.id && d.microbeId === microbe.id
                )?.relativeAbundance ?? 0

                const x = colIndex * cellWidth
                const y = rowIndex * cellHeight
                const color = isMissing ? '#374151' : getColorForValue(abundance, minValue, maxValue)
                const highlighted = isCellHighlighted(sample.id, microbe.id)
                const isSelected =
                  selectedSample === sample.id && selectedMicrobe === microbe.id

                const cellData: HeatmapCellData = {
                  sampleId: sample.id,
                  microbeId: microbe.id,
                  abundance,
                  relativeAbundance,
                  sampleName: sampleMap.get(sample.id) ?? sample.id,
                  microbeName: microbeMap.get(microbe.id) ?? microbe.id,
                }

                return (
                  <g key={key}>
                    {isMissing && (
                      <rect
                        x={x + 1}
                        y={y + 1}
                        width={cellWidth - 2}
                        height={cellHeight - 2}
                        fill="url(#missingPattern)"
                        rx={2}
                        className={cn(
                          'cursor-pointer transition-all duration-200',
                          !highlighted && 'opacity-30',
                          isSelected && 'stroke-2 stroke-teal-400'
                        )}
                        style={{
                          transformOrigin: `${x + cellWidth / 2}px ${y + cellHeight / 2}px`,
                        }}
                        onMouseEnter={() => handleCellHover(cellData)}
                        onMouseLeave={() => handleCellHover(null)}
                        onMouseMove={(e) => handleMouseMove(e, cellData)}
                        onClick={() => handleCellClick(cellData)}
                      />
                    )}
                    {!isMissing && (
                      <rect
                        x={x + 1}
                        y={y + 1}
                        width={cellWidth - 2}
                        height={cellHeight - 2}
                        fill={color}
                        rx={2}
                        className={cn(
                          'cursor-pointer transition-all duration-200',
                          !highlighted && 'opacity-30',
                          isSelected && 'stroke-2 stroke-teal-400'
                        )}
                        style={{
                          transformOrigin: `${x + cellWidth / 2}px ${y + cellHeight / 2}px`,
                        }}
                        onMouseEnter={() => handleCellHover(cellData)}
                        onMouseLeave={() => handleCellHover(null)}
                        onMouseMove={(e) => handleMouseMove(e, cellData)}
                        onClick={() => handleCellClick(cellData)}
                      />
                    )}
                  </g>
                )
              })
            )}
            <defs>
              <pattern id="missingPattern" patternUnits="userSpaceOnUse" width="6" height="6">
                <path d="M0,6 L6,0" stroke="#4b5563" strokeWidth="1" />
              </pattern>
            </defs>
          </g>

          <g transform={`translate(${rowLabelWidth}, ${colLabelHeight + microbes.length * cellHeight + 20})`}>
            <foreignObject width={samples.length * cellWidth} height={legendHeight}>
              <div className="flex items-center justify-center">
                <ColorLegend minValue={minValue} maxValue={maxValue} />
              </div>
            </foreignObject>
          </g>
        </svg>
      </div>

      {hoveredCell && (
        <HeatmapTooltip
          microbeName={hoveredCell.microbeName}
          sampleName={hoveredCell.sampleName}
          abundance={hoveredCell.abundance}
          relativeAbundance={hoveredCell.relativeAbundance}
          position={tooltipPosition}
          visible={!!hoveredCell}
        />
      )}
    </div>
  )
}
