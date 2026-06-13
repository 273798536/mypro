import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStore } from '@/store/useStore'
import type { Cell, ResistanceReading } from '@/types'

function getCellReading(readings: ResistanceReading[], cellId: string) {
  return readings.find((r) => r.cellId === cellId)
}

function getCellColor(value: number, threshold: number, boundaryCoeff: number) {
  if (value > threshold) return 'anomaly'
  if (value > threshold * boundaryCoeff) return 'boundary'
  return 'normal'
}

const bgMap = {
  anomaly: 'bg-red-500/25',
  boundary: 'bg-amber-500/20',
  normal: 'bg-green-500/15',
}

const textMap = {
  anomaly: 'text-red-400',
  boundary: 'text-amber-400',
  normal: 'text-green-400',
}

interface TooltipData {
  cell: Cell
  reading: ResistanceReading
  x: number
  y: number
}

export default function HeatMap() {
  const { cells, readingsMap, currentTimestamp, selectedCellId, setSelectedCellId, thresholds } =
    useStore()
  const [tooltip, setTooltip] = useState<TooltipData | null>(null)

  const thresholdConfig = thresholds.find((t) => t.parameter === '内阻安全阈值')
  const boundaryConfig = thresholds.find((t) => t.parameter === '边界样本系数')
  const threshold = thresholdConfig?.value ?? 40
  const boundaryCoeff = boundaryConfig?.value ?? 0.95

  const readings = readingsMap[currentTimestamp] || []

  const grid: (Cell | undefined)[][] = Array.from({ length: 4 }, () =>
    Array.from({ length: 8 }, () => undefined)
  )
  for (const cell of cells) {
    if (cell.row >= 0 && cell.row < 4 && cell.col >= 0 && cell.col < 8) {
      grid[cell.row][cell.col] = cell
    }
  }

  const handleMouseEnter = (
    e: React.MouseEvent<HTMLDivElement>,
    cell: Cell,
    reading: ResistanceReading | undefined
  ) => {
    if (!reading) return
    const rect = e.currentTarget.getBoundingClientRect()
    setTooltip({ cell, reading, x: rect.right + 8, y: rect.top })
  }

  const handleClick = (cellId: string) => {
    setSelectedCellId(selectedCellId === cellId ? null : cellId)
  }

  return (
    <div className="relative" style={{ background: '#1a1a2e' }}>
      <style>{`
        @keyframes pulse-border {
          0%, 100% { border-color: rgba(239, 68, 68, 0.4); }
          50% { border-color: rgba(239, 68, 68, 1); }
        }
        .pulse-anomaly { animation: pulse-border 1.5s ease-in-out infinite; }
      `}</style>

      <div className="grid grid-cols-8 gap-1.5 p-4">
        {grid.flat().map((cell, i) => {
          if (!cell) return <div key={i} className="aspect-square" />
          const reading = getCellReading(readings, cell.id)
          const value = reading?.valueMohm ?? 0
          const status = getCellColor(value, threshold, boundaryCoeff)
          const isSelected = selectedCellId === cell.id
          const isAnomaly = status === 'anomaly'

          return (
            <div
              key={cell.id}
              className={cn(
                'relative flex aspect-square cursor-pointer flex-col items-center justify-center rounded-md border-2 transition-all',
                bgMap[status],
                isSelected ? 'border-amber-400' : 'border-transparent',
                isAnomaly && !isSelected && 'pulse-anomaly border-red-500'
              )}
              onMouseEnter={(e) => handleMouseEnter(e, cell, reading)}
              onMouseLeave={() => setTooltip(null)}
              onClick={() => handleClick(cell.id)}
            >
              <span
                className={cn('text-sm font-semibold', textMap[status])}
                style={{ fontFamily: 'JetBrains Mono, monospace' }}
              >
                {reading ? value.toFixed(1) : '—'}
              </span>
              <span className="mt-0.5 text-[10px] text-gray-500">mΩ</span>
              {isAnomaly && (
                <AlertTriangle className="absolute top-1 right-1 h-3 w-3 text-red-400" />
              )}
            </div>
          )
        })}
      </div>

      {tooltip && (
        <div
          className="pointer-events-none fixed z-50 rounded-lg border border-gray-700 px-3 py-2 text-xs shadow-xl"
          style={{
            left: tooltip.x,
            top: tooltip.y,
            background: '#1a1a2e',
            fontFamily: 'JetBrains Mono, monospace',
          }}
        >
          <div className="text-gray-300 font-semibold">{tooltip.cell.id}</div>
          <div className="text-gray-500">{tooltip.cell.moduleName}</div>
          <div className={cn('mt-1', textMap[getCellColor(tooltip.reading.valueMohm, threshold, boundaryCoeff)])}>
            {tooltip.reading.valueMohm.toFixed(2)} mΩ
          </div>
          <div className="text-gray-500 mt-0.5">
            位置: R{tooltip.cell.row} C{tooltip.cell.col}
          </div>
          {tooltip.reading.isAnomaly && (
            <div className="text-red-400 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              异常
            </div>
          )}
        </div>
      )}
    </div>
  )
}
