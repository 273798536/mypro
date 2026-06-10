import { useOffTargetStore } from '@/store/offTargetStore'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { useEffect, useState } from 'react'

const ANOMALY_COLOR = '#f97316'
const NORMAL_COLOR = '#0d9488'
const APPROVED_COLOR = '#14b8a6'

export default function StatisticsCharts() {
  const { getFilteredCandidates, reagentBatches } = useOffTargetStore()
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const filtered = getFilteredCandidates()

  const batchData = reagentBatches.map((batch) => {
    const batchCandidates = filtered.filter((c) => c.reagentBatchId === batch.id)
    return {
      name: batch.batchNo.slice(-4),
      batchNo: batch.batchNo,
      normal: batchCandidates.filter((c) => c.status === 'normal').length,
      anomaly: batchCandidates.filter((c) => c.status === 'anomaly').length,
      approved: batchCandidates.filter((c) => c.status === 'approved').length,
    }
  }).filter((d) => d.normal + d.anomaly + d.approved > 0)

  const statusData = [
    { name: '正常', value: filtered.filter((c) => c.status === 'normal').length, color: NORMAL_COLOR },
    { name: '异常', value: filtered.filter((c) => c.status === 'anomaly').length, color: ANOMALY_COLOR },
    { name: '已复核', value: filtered.filter((c) => c.status === 'approved').length, color: APPROVED_COLOR },
  ].filter((d) => d.value > 0)

  if (!mounted) return null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <h3 className="text-sm font-medium text-zinc-700 mb-3">按试剂批号异常分布</h3>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={batchData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#71717a' }} />
            <YAxis tick={{ fontSize: 11, fill: '#71717a' }} allowDecimals={false} />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
              formatter={(value: number, name: string) => [value, name === 'anomaly' ? '异常' : name === 'approved' ? '已复核' : '正常']}
              labelFormatter={(label: string) => {
                const item = batchData.find((d) => d.name === label)
                return item?.batchNo || label
              }}
            />
            <Bar dataKey="normal" stackId="a" fill={NORMAL_COLOR} radius={[0, 0, 0, 0]} />
            <Bar dataKey="anomaly" stackId="a" fill={ANOMALY_COLOR} radius={[0, 0, 0, 0]} />
            <Bar dataKey="approved" stackId="a" fill={APPROVED_COLOR} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <h3 className="text-sm font-medium text-zinc-700 mb-3">状态分布</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={statusData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
              dataKey="value"
            >
              {statusData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Legend
              formatter={(value: string) => <span className="text-xs text-zinc-600">{value}</span>}
            />
            <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
