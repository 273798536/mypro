import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FlaskConical, TrendingUp, AlertCircle, PlusCircle } from 'lucide-react'
import StatusBadge from '@/components/StatusBadge'
import TypeBadge from '@/components/TypeBadge'
import type { CryoRecord, AnomalyReview, StatisticsResponse } from '../../api/types'

interface StatCard {
  label: string
  value: string | number
  icon: React.ReactNode
  gradient: string
}

function Skeleton() {
  return <div className="animate-pulse rounded-lg bg-gray-200 h-24" />
}

function RowSkeleton() {
  return (
    <tr>
      <td colSpan={6} className="px-5 py-2.5">
        <div className="animate-pulse h-10 rounded bg-gray-100" />
      </td>
    </tr>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [stats, setStats] = useState<StatisticsResponse | null>(null)
  const [records, setRecords] = useState<CryoRecord[]>([])
  const [anomalies, setAnomalies] = useState<AnomalyReview[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAll() {
      try {
        const [sRes, rRes, aRes] = await Promise.all([
          fetch('/api/statistics'), fetch('/api/records?limit=10'), fetch('/api/anomalies?review_status=pending'),
        ])
        const [sJson, rJson, aJson] = await Promise.all([sRes.json(), rRes.json(), aRes.json()])
        if (!sJson.success) throw new Error(sJson.error)
        setStats(sJson.data)
        setRecords(rJson.success ? rJson.data : [])
        setAnomalies(aJson.success ? aJson.data : [])
      } catch (e) {
        setError(e instanceof Error ? e.message : '加载数据失败')
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [])

  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthNew = stats?.by_month.find((m) => m.month === thisMonth)
  const monthTotal = monthNew ? monthNew.freeze_count + monthNew.thaw_count : 0

  const cards: StatCard[] = [
    { label: '冻存管总数', value: stats?.total_records ?? '-', icon: <FlaskConical size={24} />, gradient: 'from-teal-500 to-teal-700' },
    { label: '复苏成功率', value: stats ? `${stats.success_rate}%` : '-', icon: <TrendingUp size={24} />, gradient: 'from-emerald-500 to-emerald-700' },
    { label: '待复核数量', value: stats?.review_needed_count ?? '-', icon: <AlertCircle size={24} />, gradient: 'from-amber-500 to-amber-700' },
    { label: '本月新增', value: monthTotal || '-', icon: <PlusCircle size={24} />, gradient: 'from-sky-500 to-sky-700' },
  ]

  if (error) return <div className="p-6 text-red-600">加载失败：{error}</div>

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
          : cards.map((c) => (
              <div key={c.label} className={`relative overflow-hidden rounded-xl bg-gradient-to-br ${c.gradient} p-5 text-white shadow-md transition-transform hover:-translate-y-1 hover:shadow-lg`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium opacity-90">{c.label}</p>
                    <p className="mt-1 text-3xl font-bold">{c.value}</p>
                  </div>
                  <div className="opacity-80">{c.icon}</div>
                </div>
              </div>
            ))}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-3">
          <h2 className="text-base font-semibold text-gray-800">最近操作</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left text-gray-500">
                <th className="px-5 py-2 font-medium">日期</th>
                <th className="px-5 py-2 font-medium">类型</th>
                <th className="px-5 py-2 font-medium">细胞系</th>
                <th className="px-5 py-2 font-medium">代次</th>
                <th className="px-5 py-2 font-medium">状态</th>
                <th className="px-5 py-2 font-medium">操作者</th>
              </tr>
            </thead>
            <tbody>
              {loading
                ? Array.from({ length: 5 }).map((_, i) => <RowSkeleton key={i} />)
                : records.map((r) => (
                    <tr key={r.id} className="cursor-pointer border-b border-gray-50 hover:bg-gray-50" onClick={() => navigate(`/records/${r.id}`)}>
                      <td className="px-5 py-2.5">{r.date}</td>
                      <td className="px-5 py-2.5"><TypeBadge type={r.type} /></td>
                      <td className="px-5 py-2.5 font-medium">{r.cell_line}</td>
                      <td className="px-5 py-2.5">P{r.passage_number}</td>
                      <td className="px-5 py-2.5"><StatusBadge status={r.status} /></td>
                      <td className="px-5 py-2.5 text-gray-500">{r.operator}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      {anomalies.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-gray-800">异常提醒</h2>
          {anomalies.map((a) => (
            <div key={a.id} className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-amber-900">{a.description}</p>
                  <p className="mt-1 text-xs text-amber-700">
                    {a.actionable_hint}
                    {a.source_material_ids.length > 0 && (
                      <button onClick={() => navigate(`/records/${a.source_material_ids[0]}`)} className="ml-2 text-amber-800 underline hover:text-amber-900">
                        查看来源记录
                      </button>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
