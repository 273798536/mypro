import { useMemo } from 'react'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts'
import { useReplayStore } from '@/store/useReplayStore'
import { formatTime, getCurrentThreshold } from '@/data/mockData'

interface ParameterConfig {
  key: 'dropletDiameter' | 'flowRate' | 'temperature'
  label: string
  unit: string
  unitKey: 'dropletDiameterUnit' | 'flowRateUnit' | 'temperatureUnit'
  color: string
}

const PARAMETERS: ParameterConfig[] = [
  { key: 'dropletDiameter', label: '水滴直径', unit: 'mm', unitKey: 'dropletDiameterUnit', color: '#38bdf8' },
  { key: 'flowRate', label: '流量', unit: 'm³/h', unitKey: 'flowRateUnit', color: '#34d399' },
  { key: 'temperature', label: '温度', unit: '°C', unitKey: 'temperatureUnit', color: '#f59e0b' },
]

export default function ParameterChart() {
  const snapshots = useReplayStore((s) => s.snapshots)
  const thresholds = useReplayStore((s) => s.thresholds)
  const currentTimestamp = useReplayStore((s) => s.currentTimestamp)
  const notes = useReplayStore((s) => s.notes)

  const noteSnapshotIds = useMemo(() => {
    return new Set(
      notes.filter((n) => n.isRetrospective).map((n) => n.snapshotId)
    )
  }, [notes])

  const chartData = useMemo(() => {
    return snapshots.map((snap) => ({
      timestamp: snap.timestamp,
      dropletDiameter: snap.dropletDiameter,
      flowRate: snap.flowRate,
      temperature: snap.temperature,
      hasRetrospectiveNote: noteSnapshotIds.has(snap.id),
    }))
  }, [snapshots, noteSnapshotIds])

  const currentSnapshot = useMemo(() => {
    if (snapshots.length === 0) return null
    return snapshots.reduce((closest, snap) =>
      Math.abs(snap.timestamp - currentTimestamp) < Math.abs(closest.timestamp - currentTimestamp)
        ? snap
        : closest
    )
  }, [snapshots, currentTimestamp])

  if (chartData.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {PARAMETERS.map((param) => {
        const thresholdValue = getCurrentThreshold(param.key, currentTimestamp, thresholds)

        return (
          <div
            key={param.key}
            className="rounded-lg border border-slate-700/50 bg-[#0f172a] p-4"
          >
            <div className="mb-2 text-sm font-medium text-slate-400">
              {param.label}
            </div>

            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis
                  dataKey="timestamp"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={(ts: number) => formatTime(ts)}
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 11 }}
                  axisLine={{ stroke: '#334155' }}
                  tickLine={{ stroke: '#334155' }}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    border: '1px solid #334155',
                    borderRadius: '6px',
                    color: '#e2e8f0',
                    fontSize: 12,
                  }}
                  labelFormatter={(ts: number) => formatTime(ts)}
                  formatter={(value: number) => [`${value} ${param.unit}`, param.label]}
                />
                {thresholdValue !== null && (
                  <ReferenceLine
                    y={thresholdValue}
                    stroke="#ef4444"
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                    label={{
                      value: `阈值 ${thresholdValue}${param.unit}`,
                      position: 'right',
                      fill: '#ef4444',
                      fontSize: 10,
                    }}
                  />
                )}
                <ReferenceLine
                  x={currentTimestamp}
                  stroke="#f59e0b"
                  strokeDasharray="4 4"
                  strokeWidth={1.5}
                  label={{
                    value: '当前',
                    position: 'top',
                    fill: '#f59e0b',
                    fontSize: 10,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey={param.key}
                  stroke={param.color}
                  strokeWidth={2}
                  dot={(props: any) => {
                    const { cx, cy, payload } = props
                    if (payload?.hasRetrospectiveNote) {
                      return (
                        <circle
                          key={`note-${cx}-${cy}`}
                          cx={cx}
                          cy={cy}
                          r={5}
                          fill="#f59e0b"
                          stroke="#f59e0b"
                          strokeWidth={2}
                        />
                      )
                    }
                    return (
                      <circle
                        key={`dot-${cx}-${cy}`}
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill={param.color}
                        stroke={param.color}
                        strokeWidth={1}
                      />
                    )
                  }}
                  activeDot={{ r: 5, fill: param.color, stroke: '#fff', strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>

            <div className="mt-2 flex items-baseline gap-2">
              <span
                className="text-2xl font-bold"
                style={{ color: param.color }}
              >
                {currentSnapshot?.[param.key] ?? '--'}
              </span>
              <span className="text-sm text-slate-500">
                {currentSnapshot?.[param.unitKey] ?? param.unit}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
