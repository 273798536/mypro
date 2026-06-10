import { useLabStore } from '@/store/useLabStore'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts'
import { ShieldCheck, AlertTriangle, XCircle, Thermometer, ScanLine, FlaskConical } from 'lucide-react'
import { Link } from 'react-router-dom'

const COLORS = ['#0d9488', '#f59e0b', '#6366f1', '#ec4899', '#8b5cf6']

export default function Dashboard() {
  const records = useLabStore((s) => s.records)
  const temperatureCurves = useLabStore((s) => s.temperatureCurves)
  const spectralData = useLabStore((s) => s.spectralData)
  const concentrationRecords = useLabStore((s) => s.concentrationRecords)

  const passCount = records.filter((r) => r.status === 'pass').length
  const pendingCount = records.filter((r) => r.status === 'pending').length
  const failCount = records.filter((r) => r.status === 'fail').length

  const mergedTimeSet = new Set<number>()
  temperatureCurves.forEach((c) => c.timePoints.forEach((t) => mergedTimeSet.add(t)))
  const sortedTimes = Array.from(mergedTimeSet).sort((a, b) => a - b)

  const chartData = sortedTimes.map((t) => {
    const point: Record<string, number> = { time: t }
    temperatureCurves.forEach((curve, idx) => {
      const i = curve.timePoints.indexOf(t)
      point[`curve-${idx}`] = i !== -1 ? curve.temperaturePoints[i] : undefined as unknown as number
    })
    return point
  })

  const allAnomalyRanges = temperatureCurves.flatMap((c) => c.anomalyRanges)

  const overlapRecords = spectralData.filter((s) => s.hasOverlap)

  const concAlerts = concentrationRecords.filter((c) => c.safetyNote)

  const today = new Date().toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="min-h-screen bg-gray-50 p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-teal-700">实验课安全闯关</h1>
        <p className="text-sm text-gray-500 mt-1">{today}</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: '通过', count: passCount, icon: ShieldCheck, border: 'border-l-green-500', text: 'text-green-600' },
          { label: '待确认', count: pendingCount, icon: AlertTriangle, border: 'border-l-amber-500', text: 'text-amber-600' },
          { label: '不通过', count: failCount, icon: XCircle, border: 'border-l-red-500', text: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className={`card border-l-4 ${s.border} p-4`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-3xl font-bold ${s.text}`}>{s.count}</p>
                <p className="text-sm text-gray-500 mt-1">{s.label}</p>
              </div>
              <s.icon className={`w-8 h-8 ${s.text} opacity-60`} />
            </div>
          </div>
        ))}
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Thermometer className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-teal-700">温度曲线监控</h2>
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="time" unit="min" tick={{ fontSize: 12 }} />
            <YAxis unit="°C" tick={{ fontSize: 12 }} />
            <Tooltip />
            <Legend />
            {allAnomalyRanges.map((range, idx) => (
              <ReferenceArea
                key={idx}
                x1={range.start}
                x2={range.end}
                stroke="red"
                fill="red"
                fillOpacity={0.15}
              />
            ))}
            {temperatureCurves.map((_, idx) => (
              <Line
                key={idx}
                type="monotone"
                dataKey={`curve-${idx}`}
                stroke={COLORS[idx % COLORS.length]}
                dot={false}
                name={`曲线 ${idx + 1}`}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <ScanLine className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-teal-700">谱峰重叠告警</h2>
        </div>
        {overlapRecords.length === 0 ? (
          <p className="text-sm text-gray-400">暂无重叠告警</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 border-b">
                <th className="py-2">物质名称</th>
                <th className="py-2">重叠区域</th>
                <th className="py-2">重叠比例</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {overlapRecords.map((s) =>
                s.overlapRegions.map((region, ri) => (
                  <tr key={`${s.id}-${ri}`} className="border-b border-l-4 border-l-amber-400">
                    <td className="py-2 pl-3">{s.substanceName}</td>
                    <td className="py-2">{region.start} – {region.end}</td>
                    <td className="py-2">{(region.overlapRatio * 100).toFixed(0)}%</td>
                    <td className="py-2">
                      <Link to="/spectral" className="text-teal-700 hover:underline">查看</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <div className="card p-4">
        <div className="flex items-center gap-2 mb-3">
          <FlaskConical className="w-5 h-5 text-teal-700" />
          <h2 className="text-lg font-semibold text-teal-700">称量精度提示</h2>
        </div>
        {concAlerts.length === 0 ? (
          <p className="text-sm text-gray-400">暂无提示</p>
        ) : (
          <ul className="space-y-2">
            {concAlerts.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-sm p-2 rounded bg-amber-50 border-l-4 border-l-amber-400">
                <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-gray-800">{c.substance}</span>
                  <span className="text-gray-500 ml-2">{c.value}{c.unit} → {c.convertedValue}{c.convertedUnit}</span>
                  <p className="text-amber-700 mt-0.5">{c.safetyNote}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
