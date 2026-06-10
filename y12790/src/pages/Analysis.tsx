import { useParams, Link } from 'react-router-dom'
import { useStore } from '@/store'
import { cn } from '@/lib/utils'
import { GRADE_LABELS } from '@/utils/analysis'
import StatusBadge from '@/components/StatusBadge'
import type { ScatterShapeProps } from 'recharts'
import type { SpectralPeak } from '@/types'
import {
  ComposedChart,
  LineChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ReferenceArea,
  Dot,
  ResponsiveContainer,
} from 'recharts'
import { ArrowRight, AlertTriangle, XCircle } from 'lucide-react'

function NullField() {
  return <span className="text-gray-400">未录入</span>
}

const ELEMENT_COLORS: Record<string, string> = {
  Pb: '#6366f1',
  Cd: '#f59e0b',
  Cr: '#10b981',
  As: '#ef4444',
  Zn: '#8b5cf6',
  Cu: '#ec4899',
  Ni: '#14b8a6',
  Hg: '#f97316',
}

function getElementColor(element: string): string {
  return ELEMENT_COLORS[element] ?? '#64748b'
}

function generateGaussianCurve(peaks: SpectralPeak[], steps = 300) {
  if (peaks.length === 0) return []
  const minPos = Math.min(...peaks.map((p) => p.position)) - 1.5
  const maxPos = Math.max(...peaks.map((p) => p.position)) + 1.5
  const step = (maxPos - minPos) / steps
  const data: { x: number; y: number }[] = []
  for (let i = 0; i <= steps; i++) {
    const x = minPos + i * step
    let y = 0
    for (const peak of peaks) {
      const sigma = peak.halfWidth * 1.2
      y += peak.intensity * Math.exp(-((x - peak.position) ** 2) / (2 * sigma ** 2))
    }
    data.push({ x: Math.round(x * 1000) / 1000, y: Math.round(y) })
  }
  return data
}

function getOverlapZones(peaks: SpectralPeak[]): { x1: number; x2: number }[] {
  const zones: { x1: number; x2: number }[] = []
  const overlapping = peaks.filter((p) => p.isOverlapping)
  const visited = new Set<string>()
  for (const peak of overlapping) {
    if (visited.has(peak.id)) continue
    const partner = peaks.find((p) => p.id === peak.overlapWith)
    if (!partner || visited.has(partner.id)) continue
    visited.add(peak.id)
    visited.add(partner.id)
    const x1 = Math.min(peak.position, partner.position) - 0.15
    const x2 = Math.max(peak.position, partner.position) + 0.15
    zones.push({ x1, x2 })
  }
  return zones
}

export default function Analysis() {
  const { id } = useParams<{ id: string }>()
  const record = useStore((s) => s.records.find((r) => r.id === id))

  if (!record) {
    return (
      <div className="flex h-64 items-center justify-center text-gray-500">
        未找到记录
      </div>
    )
  }

  const { balanceCalculation: bc, spectralPeaks, reactionCondition: rc } = record
  const deviation = bc.balanceDeviation
  const deviationLevel = deviation === null ? 'none' : deviation > 15 ? 'danger' : deviation > 5 ? 'warning' : 'ok'

  const curveData = generateGaussianCurve(spectralPeaks)
  const overlapZones = getOverlapZones(spectralPeaks)

  const peakScatterData = spectralPeaks.map((p) => ({
    x: p.position,
    y: p.intensity,
    element: p.element,
    isOverlapping: p.isOverlapping,
    color: getElementColor(p.element),
  }))

  const maxIntensity = Math.max(...spectralPeaks.map((p) => p.intensity), 1)

  const tempData = record.temperatureCurve.map((p) => ({
    time: p.timePoint,
    value: p.temperature,
    isExceeding: p.isExceeding,
  }))

  const phData = record.phCurve.map((p) => ({
    time: p.timePoint,
    value: p.ph,
    isExceeding: p.isExceeding,
  }))

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="font-['Noto_Serif_SC'] text-2xl font-bold text-slate-800">{record.sampleCode}</h1>
          <StatusBadge grade={record.status} />
        </div>
        <Link
          to="/review"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-900"
        >
          进入复核 <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">配平计算器</h2>
        <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
          {([
            ['提取液体积 (mL)', bc.extractVolume],
            ['样品质量 (g)', bc.sampleMass],
            ['稀释倍数', bc.dilutionFactor],
            ['标称浓度', bc.nominalConcentration],
            ['计算浓度', bc.calculatedConcentration],
            ['配平偏差 (%)', bc.balanceDeviation],
          ] as [string, number | null][]).map(([label, val]) => (
            <div key={label} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
              <div className="text-xs text-slate-500">{label}</div>
              <div className="mt-1 text-sm font-semibold text-slate-800">
                {val !== null ? val : <NullField />}
              </div>
            </div>
          ))}
        </div>
        {deviationLevel !== 'none' && deviationLevel !== 'ok' && (
          <div
            className={cn(
              'mt-4 flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm',
              deviationLevel === 'warning' && 'bg-amber-50 text-amber-700',
              deviationLevel === 'danger' && 'bg-red-50 text-red-700',
            )}
          >
            {deviationLevel === 'warning' ? (
              <AlertTriangle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {deviationLevel === 'warning'
              ? `配平偏差 ${deviation}% 超出5%阈值，需关注`
              : `配平偏差 ${deviation}% 超出15%阈值，数据不可用`}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">谱图标注</h2>
        <ResponsiveContainer width="100%" height={320}>
          <ComposedChart margin={{ top: 20, right: 30, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} tick={{ fontSize: 11 }} />
            <YAxis domain={[0, maxIntensity * 1.2]} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value: number, name: string) =>
                name === 'peak' ? [value, '峰强度'] : [value, '强度']
              }
              labelFormatter={(label: number) => `位置: ${label}`}
            />
            {overlapZones.map((zone, i) => (
              <ReferenceArea
                key={i}
                x1={zone.x1}
                x2={zone.x2}
                fill="#fb923c"
                fillOpacity={0.15}
                stroke="#fb923c"
                strokeOpacity={0.3}
              />
            ))}
            <Line
              data={curveData}
              dataKey="y"
              type="monotone"
              stroke="#475569"
              strokeWidth={1.5}
              dot={false}
              isAnimationActive={false}
              xAxisId={0}
              yAxisId={0}
            />
            <Scatter
              data={peakScatterData}
              dataKey="y"
              name="peak"
              isAnimationActive={false}
              shape={(props: ScatterShapeProps) => {
                const { cx, cy, payload } = props as ScatterShapeProps & {
                  payload: { element: string; color: string; isOverlapping: boolean }
                }
                return (
                  <g>
                    <Dot
                      cx={cx}
                      cy={cy}
                      r={5}
                      fill={payload.color}
                      stroke="#fff"
                      strokeWidth={1.5}
                    />
                    <text
                      x={cx}
                      y={(cy as number) - 10}
                      textAnchor="middle"
                      fill={payload.color}
                      fontSize={11}
                      fontWeight={600}
                    >
                      {payload.element}
                    </text>
                  </g>
                )
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 px-12 pt-2">
          {peakScatterData.map((m) => (
            <span
              key={m.element + m.x}
              className="inline-flex items-center gap-1 text-xs font-medium"
              style={{ color: m.color }}
            >
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              {m.element} ({m.x})
              {m.isOverlapping && (
                <span className="text-orange-500">⚠重叠</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-slate-800">越界判定</h2>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-600">温度曲线</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={tempData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 2', 'dataMax + 2']} />
                <Tooltip formatter={(value: number) => [`${value}℃`, '温度']} />
                <ReferenceLine y={rc.tempUpperLimit} stroke="#ef4444" strokeDasharray="6 3" label={{ value: '上限', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={rc.tempLowerLimit} stroke="#ef4444" strokeDasharray="6 3" label={{ value: '下限', fill: '#ef4444', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#475569"
                  strokeWidth={2}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isExceeding: boolean } }
                    return (
                      <Dot
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill={payload.isExceeding ? '#ef4444' : '#475569'}
                        stroke="none"
                      />
                    )
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div>
            <h3 className="mb-2 text-sm font-medium text-slate-600">pH曲线</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={phData} margin={{ top: 10, right: 10, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="time" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} domain={['dataMin - 0.3', 'dataMax + 0.3']} />
                <Tooltip formatter={(value: number) => [value, 'pH']} />
                <ReferenceLine y={rc.phUpperLimit} stroke="#ef4444" strokeDasharray="6 3" label={{ value: '上限', fill: '#ef4444', fontSize: 10 }} />
                <ReferenceLine y={rc.phLowerLimit} stroke="#ef4444" strokeDasharray="6 3" label={{ value: '下限', fill: '#ef4444', fontSize: 10 }} />
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#475569"
                  strokeWidth={2}
                  dot={(props: Record<string, unknown>) => {
                    const { cx, cy, payload } = props as { cx: number; cy: number; payload: { isExceeding: boolean } }
                    return (
                      <Dot
                        cx={cx}
                        cy={cy}
                        r={3}
                        fill={payload.isExceeding ? '#ef4444' : '#475569'}
                        stroke="none"
                      />
                    )
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
