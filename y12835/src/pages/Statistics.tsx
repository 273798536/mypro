import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import { BarChart3, TrendingUp, PieChartIcon, AlertCircle } from 'lucide-react'

type TabKey = 'cell_line' | 'batch' | 'date'

const TABS: { key: TabKey; label: string }[] = [
  { key: 'cell_line', label: '按细胞系' },
  { key: 'batch', label: '按试剂批号' },
  { key: 'date', label: '按时间' },
]

const COLORS = ['#0F766E', '#D97706', '#10B981', '#EF4444', '#6366F1', '#EC4899']

interface StatsOverview {
  total_records: number; freeze_count: number; thaw_count: number
  success_rate: number; review_needed_count: number
  by_cell_line: { cell_line: string; count: number; success_rate: number }[]
  by_month: { month: string; freeze_count: number; thaw_count: number; success_rate: number }[]
}

interface CellLineDetail { cell_line: string; type: string; count: number; success_rate: number; avg_viability: number }
interface BatchDetail { batch_number: string; reagent_name: string; type: string; count: number; success_rate: number; avg_viability: number }
interface DateDetail { month: string; cell_line: string; type: string; count: number; success_rate: number; avg_viability: number }

function Skeleton() {
  return <div className="animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700 h-64" />
}

export default function Statistics() {
  const [tab, setTab] = useState<TabKey>('cell_line')
  const [overview, setOverview] = useState<StatsOverview | null>(null)
  const [cellLineData, setCellLineData] = useState<CellLineDetail[]>([])
  const [batchData, setBatchData] = useState<BatchDetail[]>([])
  const [dateData, setDateData] = useState<DateDetail[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const [r1, r2, r3, r4] = await Promise.all([
        fetch('/api/statistics'), fetch('/api/statistics/by-cell-line'),
        fetch('/api/statistics/by-batch'), fetch('/api/statistics/by-date'),
      ])
      const [j1, j2, j3, j4] = await Promise.all([r1.json(), r2.json(), r3.json(), r4.json()])
      if (!j1.success) throw new Error(j1.error || '获取统计数据失败')
      setOverview(j1.data); setCellLineData(j2.data ?? [])
      setBatchData(j3.data ?? []); setDateData(j4.data ?? [])
    } catch (e: any) {
      setError(e.message || '网络请求失败')
    } finally { setLoading(false) }
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  if (loading) return <div className="space-y-4 p-6"><Skeleton /><Skeleton /><Skeleton /></div>
  if (error) return (
    <div className="flex items-center gap-2 p-6 text-red-600"><AlertCircle /><span>{error}</span></div>
  )
  if (!overview) return null

  const pieData = overview.by_cell_line.map(c => ({ name: c.cell_line, value: c.count }))

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">分组统计</h1>
        <div className="flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                tab === t.key ? 'bg-white text-primary shadow dark:bg-gray-700 dark:text-primary-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400'}`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {[
          { label: '总记录数', value: overview.total_records, icon: BarChart3, color: 'text-primary' },
          { label: '冻存次数', value: overview.freeze_count, icon: BarChart3, color: 'text-sky-600' },
          { label: '复苏次数', value: overview.thaw_count, icon: BarChart3, color: 'text-orange-600' },
          { label: '成功率', value: `${overview.success_rate}%`, icon: TrendingUp, color: 'text-emerald-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <s.icon className={`h-4 w-4 ${s.color}`} />{s.label}
            </div>
            <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{s.value}</p>
          </div>
        ))}
      </div>

      {tab === 'cell_line' && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <BarChart3 className="mr-1 inline h-4 w-4 text-primary" />各细胞系成功率
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={overview.by_cell_line}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="cell_line" tick={{ fontSize: 12 }} />
                <YAxis unit="%" tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v: number) => `${v}%`} />
                <Bar dataKey="success_rate" fill="#0F766E" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <PieChartIcon className="mr-1 inline h-4 w-4 text-accent" />细胞系分布
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">
              <TrendingUp className="mr-1 inline h-4 w-4 text-primary" />月度冻存/复苏趋势
            </h3>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={overview.by_month}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="freeze_count" name="冻存" stroke="#0F766E" strokeWidth={2} dot />
                <Line type="monotone" dataKey="thaw_count" name="复苏" stroke="#D97706" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
            <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">细胞系详情</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b text-left text-gray-500 dark:text-gray-400">
                  <th className="pb-2">细胞系</th><th className="pb-2">类型</th><th className="pb-2">数量</th><th className="pb-2">成功率</th><th className="pb-2">平均存活率</th>
                </tr></thead>
                <tbody>
                  {cellLineData.map((r, i) => (
                    <tr key={i} className="border-b last:border-0 dark:border-gray-700">
                      <td className="py-2 font-medium">{r.cell_line}</td>
                      <td className="py-2">{r.type === 'freeze' ? '冻存' : '复苏'}</td>
                      <td className="py-2">{r.count}</td>
                      <td className="py-2">{r.success_rate}%</td>
                      <td className="py-2">{r.avg_viability ? `${r.avg_viability.toFixed(1)}%` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === 'batch' && (
        <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">试剂批号详情</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500 dark:text-gray-400">
                <th className="pb-2">批号</th><th className="pb-2">试剂名</th><th className="pb-2">类型</th><th className="pb-2">数量</th><th className="pb-2">成功率</th><th className="pb-2">平均存活率</th>
              </tr></thead>
              <tbody>
                {batchData.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 dark:border-gray-700">
                    <td className="py-2 font-medium">{r.batch_number}</td>
                    <td className="py-2">{r.reagent_name}</td>
                    <td className="py-2">{r.type === 'freeze' ? '冻存' : '复苏'}</td>
                    <td className="py-2">{r.count}</td>
                    <td className="py-2">{r.success_rate}%</td>
                    <td className="py-2">{r.avg_viability ? `${r.avg_viability.toFixed(1)}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'date' && (
        <div className="rounded-xl border bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <h3 className="mb-3 text-sm font-semibold text-gray-700 dark:text-gray-300">时间维度详情</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500 dark:text-gray-400">
                <th className="pb-2">月份</th><th className="pb-2">细胞系</th><th className="pb-2">类型</th><th className="pb-2">数量</th><th className="pb-2">成功率</th><th className="pb-2">平均存活率</th>
              </tr></thead>
              <tbody>
                {dateData.map((r, i) => (
                  <tr key={i} className="border-b last:border-0 dark:border-gray-700">
                    <td className="py-2 font-medium">{r.month}</td>
                    <td className="py-2">{r.cell_line}</td>
                    <td className="py-2">{r.type === 'freeze' ? '冻存' : '复苏'}</td>
                    <td className="py-2">{r.count}</td>
                    <td className="py-2">{r.success_rate}%</td>
                    <td className="py-2">{r.avg_viability ? `${r.avg_viability.toFixed(1)}%` : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
