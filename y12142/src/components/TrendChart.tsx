import { useMemo } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, ReferenceArea,
} from 'recharts'
import { useStore, TIME_RANGE, readings as allReadings, cells as allCells, thresholdConfigs, thresholdVersions } from '@/store/useStore'
import type { CellReading } from '@/types'

function formatTime(ts: number): string {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

export default function TrendChart() {
  const selectedCellId = useStore((s) => s.selectedCellId)
  const thresholdVersionId = useStore((s) => s.thresholdVersionId)

  const cell = useMemo(() => {
    if (!selectedCellId) return null
    return allCells.find((c) => c.id === selectedCellId) ?? null
  }, [selectedCellId])

  const cellReadings = useMemo(() => {
    if (!selectedCellId) return []
    return allReadings.filter((r) => r.cellId === selectedCellId)
  }, [selectedCellId])

  const config = useMemo(() => {
    return thresholdConfigs.find((c) => c.versionId === thresholdVersionId) || thresholdConfigs[0]
  }, [thresholdVersionId])

  const chartData = useMemo(() => {
    return cellReadings.map((r: CellReading) => ({
      timestamp: r.timestamp,
      temperature: r.temperature,
      voltage: r.voltage,
    }))
  }, [cellReadings])

  const driftStart = TIME_RANGE.start + 0.3 * (TIME_RANGE.end - TIME_RANGE.start)
  const missingStart = TIME_RANGE.start + 0.4 * (TIME_RANGE.end - TIME_RANGE.start)
  const missingEnd = TIME_RANGE.start + 0.6 * (TIME_RANGE.end - TIME_RANGE.start)

  if (!selectedCellId) {
    return (
      <div className="bg-[#0d1117] border border-gray-700 rounded-lg p-4 flex items-center justify-center h-full">
        <p className="text-gray-500 text-sm">点击 3D 电芯查看趋势</p>
      </div>
    )
  }

  return (
    <div className="bg-[#0d1117] border border-gray-700 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-gray-300 text-sm font-medium mb-3 shrink-0">
        趋势监测 <span className="text-gray-500 font-mono">{selectedCellId}</span>
      </h3>
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
            <XAxis
              dataKey="timestamp"
              tickFormatter={formatTime}
              stroke="#4b5563"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
            />
            <YAxis
              yAxisId="temp"
              stroke="#4b5563"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="volt"
              orientation="right"
              stroke="#4b5563"
              tick={{ fill: '#9ca3af', fontSize: 10 }}
              domain={['auto', 'auto']}
            />
            <Tooltip
              contentStyle={{ backgroundColor: '#1a1f2e', border: '1px solid #374151', borderRadius: 4, fontSize: 12 }}
              labelFormatter={formatTime}
              labelStyle={{ color: '#9ca3af' }}
            />
            {cell?.status === 'drift' && (
              <ReferenceArea
                yAxisId="temp"
                x1={driftStart}
                x2={TIME_RANGE.end}
                fill="#f59e0b"
                fillOpacity={0.08}
                stroke="#f59e0b"
                strokeOpacity={0.3}
              />
            )}
            {cell?.status === 'missing_sample' && (
              <ReferenceArea
                yAxisId="temp"
                x1={missingStart}
                x2={missingEnd}
                fill="#8b5cf6"
                fillOpacity={0.1}
                stroke="#8b5cf6"
                strokeOpacity={0.3}
              />
            )}
            <ReferenceLine
              yAxisId="temp"
              y={config.tempWarning}
              stroke="#f59e0b"
              strokeDasharray="6 4"
              strokeOpacity={0.6}
            />
            <ReferenceLine
              yAxisId="temp"
              y={config.tempCritical}
              stroke="#ef4444"
              strokeDasharray="6 4"
              strokeOpacity={0.6}
            />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              stroke="#f59e0b"
              strokeWidth={1.5}
              dot={false}
            />
            <Line
              yAxisId="volt"
              type="monotone"
              dataKey="voltage"
              stroke="#22d3ee"
              strokeWidth={1.5}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
