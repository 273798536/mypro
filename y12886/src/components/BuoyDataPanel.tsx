import { useState } from 'react'
import { Waves } from 'lucide-react'
import {
  Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
  ComposedChart,
} from 'recharts'
import type { BuoyRecord } from '@/types'
import { psuToPermille } from '@/utils/dataEngine'

interface BuoyDataPanelProps {
  records: BuoyRecord[]
  onSupplement: (recordId: string, field: string, value: string) => void
}

function fmtTime(ts: string) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const SALINITY_THRESHOLD = 35.1

export default function BuoyDataPanel({ records, onSupplement }: BuoyDataPanelProps) {
  const [supplementId, setSupplementId] = useState<string | null>(null)
  const [supplementValue, setSupplementValue] = useState('')

  const chartData = records.map(r => ({
    time: fmtTime(r.timestamp),
    salinity: r.salinityNormalized,
    temperature: r.waterTemp,
    isAnomaly: r.isAnomaly,
  }))

  const anomalyDot = (props: { cx?: number; cy?: number; payload?: { isAnomaly: boolean } }) => {
    const { cx, cy, payload } = props
    if (!cx || !cy || !payload?.isAnomaly) return null
    return <circle cx={cx} cy={cy} r={5} fill="#EF4444" stroke="#fff" strokeWidth={2} />
  }

  const handleSupplement = (recordId: string, field: string) => {
    if (!supplementValue.trim()) return
    onSupplement(recordId, field, supplementValue.trim())
    setSupplementId(null)
    setSupplementValue('')
  }

  return (
    <div className="rounded-lg overflow-hidden shadow-md border border-gray-200">
      <div className="bg-[#0C2D48] text-white px-4 py-3 flex items-center gap-2">
        <Waves className="w-5 h-5" />
        <span className="font-semibold text-base">浮标数据</span>
      </div>

      <div className="bg-white p-4">
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 10, right: 50, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis dataKey="time" tick={{ fontSize: 12 }} />
            <YAxis
              yAxisId="left"
              label={{ value: '盐度 (‰)', angle: -90, position: 'insideLeft', offset: -5, style: { fontSize: 12 } }}
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <YAxis
              yAxisId="right"
              orientation="right"
              label={{ value: '水温 (°C)', angle: 90, position: 'insideRight', offset: -5, style: { fontSize: 12 } }}
              tick={{ fontSize: 11 }}
              domain={['auto', 'auto']}
            />
            <Tooltip />
            <Legend />
            <ReferenceLine yAxisId="left" y={SALINITY_THRESHOLD} stroke="#EF4444" strokeDasharray="6 4" label={{ value: `${SALINITY_THRESHOLD}‰`, position: 'insideTopRight', fill: '#EF4444', fontSize: 11 }} />
            <Line yAxisId="left" type="monotone" dataKey="salinity" stroke="#2E8BC0" strokeWidth={2} dot={anomalyDot} name="盐度 (‰)" />
            <Line yAxisId="right" type="monotone" dataKey="temperature" stroke="#FF6B35" strokeWidth={2} dot={false} name="水温 (°C)" />
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white border-t border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-600">
                <th className="px-3 py-2 text-left font-medium">时间</th>
                <th className="px-3 py-2 text-left font-medium">浮标</th>
                <th className="px-3 py-2 text-left font-medium">盐度</th>
                <th className="px-3 py-2 text-left font-medium">水温</th>
                <th className="px-3 py-2 text-left font-medium">潮位</th>
                <th className="px-3 py-2 text-left font-medium">状态</th>
                <th className="px-3 py-2 text-left font-medium">操作</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => {
                const isPsu = r.salinityUnit === 'PSU'
                const converted = isPsu ? psuToPermille(r.salinity) : r.salinity
                return (
                  <tr key={r.id} className={`border-t border-gray-100 ${r.isAnomaly ? 'bg-red-50' : ''}`}>
                    <td className="px-3 py-2">{fmtTime(r.timestamp)}</td>
                    <td className="px-3 py-2">{r.buoyId}</td>
                    <td className="px-3 py-2">
                      {isPsu ? (
                        <span className="text-orange-600">
                          {converted}‰ <span className="text-xs">(PSU→‰)</span>
                        </span>
                      ) : (
                        <span>{r.salinity}‰</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.isAnomaly ? (
                        <span className="text-red-600" title={r.anomalyReason}>
                          {r.waterTempRaw}
                        </span>
                      ) : (
                        <span>{r.waterTemp}°C</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.tideLevel !== null ? (
                        <span>{r.tideLevel}m</span>
                      ) : (
                        <span className="text-orange-500 italic text-xs">缺失</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.isAnomaly ? (
                        <span className="text-red-600 cursor-help" title={r.anomalyReason}>异常</span>
                      ) : (
                        <span className="text-green-600">正常</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {r.isAnomaly && supplementId !== r.id && (
                        <button
                          className="px-2 py-0.5 text-xs rounded bg-[#0C2D48] text-white hover:bg-[#145DA0] transition-colors"
                          onClick={() => { setSupplementId(r.id); setSupplementValue('') }}
                        >
                          补录
                        </button>
                      )}
                      {supplementId === r.id && (
                        <div className="flex items-center gap-1">
                          <input
                            className="w-16 px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-[#0C2D48]"
                            value={supplementValue}
                            onChange={e => setSupplementValue(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSupplement(r.id, 'waterTemp') }}
                            placeholder="修正值"
                          />
                          <button
                            className="px-1.5 py-0.5 text-xs rounded bg-green-600 text-white hover:bg-green-700"
                            onClick={() => handleSupplement(r.id, 'waterTemp')}
                          >✓</button>
                          <button
                            className="px-1.5 py-0.5 text-xs rounded bg-gray-400 text-white hover:bg-gray-500"
                            onClick={() => setSupplementId(null)}
                          >✕</button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
