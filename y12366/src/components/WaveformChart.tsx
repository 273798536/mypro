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
  ReferenceArea,
} from 'recharts'
import { useSeismicStore } from '@/store/useSeismicStore'
import type { AccelerationRecord, DisplacementRecord } from '@/types'

interface ChartPoint {
  time: number
  acceleration: number | null
  displacement: number | null
  saturated: boolean
}

interface SaturatedRegion {
  start: number
  end: number
}

function processChartData(
  accel: AccelerationRecord[],
  disp: DisplacementRecord[],
  accelOffset: number,
  dispOffset: number,
  baseTime: number
): ChartPoint[] {
  const pointMap = new Map<number, { acceleration: number | null; displacement: number | null; saturated: boolean }>()

  for (const d of accel) {
    const adjustedTs = d.timestamp + accelOffset
    pointMap.set(adjustedTs, { acceleration: d.value, displacement: null, saturated: d.saturated })
  }

  for (const d of disp) {
    const adjustedTs = d.timestamp + dispOffset
    const existing = pointMap.get(adjustedTs)
    if (existing) {
      existing.displacement = d.value
    } else {
      pointMap.set(adjustedTs, { acceleration: null, displacement: d.value, saturated: false })
    }
  }

  return Array.from(pointMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([adjustedTs, vals]) => ({
      time: (adjustedTs - baseTime) / 1000,
      acceleration: vals.acceleration,
      displacement: vals.displacement,
      saturated: vals.saturated,
    }))
}

function findSaturatedRegions(data: ChartPoint[]): SaturatedRegion[] {
  const regions: SaturatedRegion[] = []
  let start = 0
  let inRegion = false

  for (let i = 0; i < data.length; i++) {
    if (data[i].saturated && !inRegion) {
      start = data[i].time
      inRegion = true
    } else if (!data[i].saturated && inRegion) {
      regions.push({ start, end: data[i - 1].time })
      inRegion = false
    }
  }
  if (inRegion && data.length > 0) {
    regions.push({ start, end: data[data.length - 1].time })
  }

  return regions
}

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: ChartPoint }> }) {
  if (!active || !payload || payload.length === 0) return null
  const data = payload[0].payload
  return (
    <div style={{ background: '#1B2838', border: '1px solid #2F4359', borderRadius: 4, padding: 8 }}>
      <p style={{ color: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, margin: 0 }}>
        {data.time.toFixed(3)}s
      </p>
      {data.acceleration !== null && (
        <p style={{ color: '#3DDC84', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, margin: 0 }}>
          Accel: {data.acceleration.toFixed(3)} m/s²
        </p>
      )}
      {data.displacement !== null && (
        <p style={{ color: '#4FC3F7', fontFamily: 'JetBrains Mono, monospace', fontSize: 12, margin: 0 }}>
          Disp: {data.displacement.toFixed(3)} mm
        </p>
      )}
    </div>
  )
}

export default function WaveformChart() {
  const accelerationData = useSeismicStore((s) => s.accelerationData)
  const displacementData = useSeismicStore((s) => s.displacementData)
  const peakExtractions = useSeismicStore((s) => s.peakExtractions)
  const playback = useSeismicStore((s) => s.playback)
  const alignmentResult = useSeismicStore((s) => s.alignmentResult)

  const accelOffset = alignmentResult?.accelOffset ?? 0
  const dispOffset = alignmentResult?.dispOffset ?? 0

  const baseTime = useMemo(() => {
    const times: number[] = []
    for (const d of accelerationData) times.push(d.timestamp + accelOffset)
    for (const d of displacementData) times.push(d.timestamp + dispOffset)
    return times.length > 0 ? Math.min(...times) : 0
  }, [accelerationData, displacementData, accelOffset, dispOffset])

  const chartData = useMemo(
    () => processChartData(accelerationData, displacementData, accelOffset, dispOffset, baseTime),
    [accelerationData, displacementData, accelOffset, dispOffset, baseTime]
  )

  const saturatedRegions = useMemo(() => findSaturatedRegions(chartData), [chartData])

  const cursorTime = useMemo(
    () => (playback.currentTime - baseTime) / 1000,
    [playback.currentTime, baseTime]
  )

  const accelPeaks = useMemo(
    () => peakExtractions.filter((p) => p.channel === 'acceleration'),
    [peakExtractions]
  )

  const dispPeaks = useMemo(
    () => peakExtractions.filter((p) => p.channel === 'displacement'),
    [peakExtractions]
  )

  if (chartData.length === 0) {
    return (
      <div
        style={{
          background: '#1B2838',
          color: '#9CA3AF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          minHeight: 300,
          borderRadius: 8,
        }}
      >
        No data loaded
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 300, background: '#1B2838', borderRadius: 8, padding: 16 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 20, right: 60, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2F4359" />
          <XAxis
            dataKey="time"
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fill: '#9CA3AF', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
            tickFormatter={(v: number) => `${v.toFixed(1)}s`}
            stroke="#2F4359"
          />
          <YAxis
            yAxisId="acceleration"
            tick={{ fill: '#3DDC84', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
            stroke="#3DDC84"
            label={{
              value: 'Accel (m/s²)',
              angle: -90,
              position: 'insideLeft',
              fill: '#3DDC84',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
          />
          <YAxis
            yAxisId="displacement"
            orientation="right"
            tick={{ fill: '#4FC3F7', fontFamily: 'JetBrains Mono, monospace', fontSize: 11 }}
            stroke="#4FC3F7"
            label={{
              value: 'Disp (mm)',
              angle: 90,
              position: 'insideRight',
              fill: '#4FC3F7',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: 11,
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          {saturatedRegions.map((region, i) => (
            <ReferenceArea
              key={`sat-${i}`}
              x1={region.start}
              x2={region.end}
              yAxisId="acceleration"
              stroke="#EF4444"
              strokeOpacity={0.4}
              fill="#EF4444"
              fillOpacity={0.15}
            />
          ))}
          {accelPeaks.map((peak) => {
            const relTime = (peak.timestamp + accelOffset - baseTime) / 1000
            return (
              <ReferenceLine
                key={peak.id}
                x={relTime}
                yAxisId="acceleration"
                stroke="#3DDC84"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `${peak.value.toFixed(2)}`,
                  position: 'top',
                  fill: '#3DDC84',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                }}
              />
            )
          })}
          {dispPeaks.map((peak) => {
            const relTime = (peak.timestamp + dispOffset - baseTime) / 1000
            return (
              <ReferenceLine
                key={peak.id}
                x={relTime}
                yAxisId="displacement"
                stroke="#4FC3F7"
                strokeDasharray="4 4"
                strokeWidth={1}
                label={{
                  value: `${peak.value.toFixed(2)}`,
                  position: 'top',
                  fill: '#4FC3F7',
                  fontFamily: 'JetBrains Mono, monospace',
                  fontSize: 10,
                }}
              />
            )
          })}
          {alignmentResult !== null && (
            <ReferenceLine
              x={cursorTime}
              yAxisId="acceleration"
              stroke="#FACC15"
              strokeWidth={2}
              label={{
                value: '▶',
                position: 'top',
                fill: '#FACC15',
                fontSize: 14,
              }}
            />
          )}
          <Line
            yAxisId="acceleration"
            dataKey="acceleration"
            stroke="#3DDC84"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          <Line
            yAxisId="displacement"
            dataKey="displacement"
            stroke="#4FC3F7"
            strokeWidth={1.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
