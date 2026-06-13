import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  Legend,
} from 'recharts'
import { useReplayStore } from '@/store/replayStore'
import { parameterLabels, parameterUnits, type ParameterKey } from '@/types'
import { useState } from 'react'

interface Props {
  useApplied?: boolean
  showOverrideMarkers?: boolean
}

const paramKeys: ParameterKey[] = ['waveHeight', 'wavePeriod', 'waterTemp', 'windSpeed', 'pressure']

const colorMap: Record<ParameterKey, string> = {
  waveHeight: '#0ea5e9',
  wavePeriod: '#a78bfa',
  waterTemp: '#34d399',
  windSpeed: '#fbbf24',
  pressure: '#f472b6',
}

export default function ReplayChart({ useApplied = false, showOverrideMarkers = true }: Props) {
  const { appliedParameters, rawParameters, overrides, noiseFlags } = useReplayStore()
  const [visibleParams, setVisibleParams] = useState<Set<ParameterKey>>(
    new Set(['waveHeight', 'windSpeed']),
  )

  const data = useApplied ? appliedParameters : rawParameters

  const chartData = data.map((d) => {
    const time = new Date(d.timestamp)
    const timeStr = `${time.getHours().toString().padStart(2, '0')}:${time
      .getMinutes()
      .toString()
      .padStart(2, '0')}`
    return {
      ...d,
      timeStr,
    }
  })

  const toggleParam = (key: ParameterKey) => {
    setVisibleParams((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const noiseParamIds = new Set(
    noiseFlags.filter((nf) => nf.isNoise).map((nf) => nf.parameterId),
  )

  return (
    <div className="bg-slate-800/50 rounded-sm border border-slate-700 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-slate-200">参数时序图</h3>
        <div className="flex flex-wrap gap-2 text-xs">
          {paramKeys.map((k) => (
            <button
              key={k}
              onClick={() => toggleParam(k)}
              className={`px-2 py-0.5 rounded-sm border transition-colors ${
                visibleParams.has(k)
                  ? 'border-sky-500/50 bg-sky-500/10 text-sky-300'
                  : 'border-slate-600 text-slate-500 hover:text-slate-300'
              }`}
            >
              {parameterLabels[k]}（{parameterUnits[k]}）
            </button>
          ))}
        </div>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis
              dataKey="timeStr"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: '#475569' }}
            />
            <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={{ stroke: '#475569' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1e293b',
                border: '1px solid #475569',
                borderRadius: '2px',
                fontSize: '12px',
                color: '#e2e8f0',
              }}
              labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
            />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              iconType="line"
            />

            {paramKeys.map(
              (k) =>
                visibleParams.has(k) && (
                  <Line
                    key={k}
                    type="monotone"
                    dataKey={k}
                    name={parameterLabels[k]}
                    stroke={colorMap[k]}
                    strokeWidth={1.5}
                    dot={false}
                    activeDot={{ r: 3 }}
                    connectNulls
                  />
                ),
            )}

            {showOverrideMarkers &&
              overrides.map((ov) => {
                const point = chartData.find((d) => d.timestamp === ov.timestamp)
                if (!point) return null
                return (
                  <ReferenceDot
                    key={ov.id}
                    x={point.timeStr}
                    y={ov.newValue}
                    r={5}
                    fill="#22c55e"
                    stroke="#fff"
                    strokeWidth={1}
                    label={{
                      value: '改判',
                      position: 'top',
                      fill: '#22c55e',
                      fontSize: 10,
                    }}
                  />
                )
              })}

            {noiseFlags
              .filter((nf) => nf.isNoise)
              .map((nf) => {
                const point = chartData.find((d) => d.id === nf.parameterId)
                if (!point) return null
                return (
                  <ReferenceDot
                    key={nf.id}
                    x={point.timeStr}
                    y={(point as any)[nf.parameterName]}
                    r={4}
                    fill="#f59e0b"
                    stroke="#f59e0b"
                    strokeDasharray="2 2"
                    label={{
                      value: '噪声',
                      position: 'top',
                      fill: '#f59e0b',
                      fontSize: 10,
                    }}
                  />
                )
              })}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-2 flex gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          人工改判点
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          噪声点
        </span>
      </div>
    </div>
  )
}
