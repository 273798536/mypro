import { useEffect, useState, useCallback } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useAppStore } from '@/store'

const GROUPS = ['对照组', '低剂量组', '中剂量组', '高剂量组']
const LOCATIONS = ['LOC-A', 'LOC-B', 'LOC-C', 'LOC-D']

export default function Statistics() {
  const { statistics, trends, fetchStatistics, fetchTrends } = useAppStore()
  const [filterGroup, setFilterGroup] = useState('')
  const [filterLocation, setFilterLocation] = useState('')
  const [dateStart, setDateStart] = useState('')
  const [dateEnd, setDateEnd] = useState('')
  const [panelOpen, setPanelOpen] = useState(true)

  const load = useCallback(() => {
    fetchStatistics()
    const params: Record<string, string> = {}
    if (dateStart) params.start_date = dateStart
    if (dateEnd) params.end_date = dateEnd
    fetchTrends(params)
  }, [fetchStatistics, fetchTrends, dateStart, dateEnd])

  useEffect(() => {
    load()
  }, [load])

  const filteredStats = filterGroup
    ? statistics.filter((s) => s.group_name === filterGroup)
    : statistics

  const maxAnomalyGroup = filteredStats.reduce(
    (max, g) => (g.anomaly_rate > max.anomaly_rate ? g : max),
    { group_name: '', anomaly_rate: 0 }
  )

  const totalAnomaly = filteredStats.reduce((s, g) => s + g.anomaly, 0)
  const totalRecords = filteredStats.reduce((s, g) => s + g.total, 0)

  return (
    <div className="space-y-6">
      <h2 className="font-title text-2xl font-semibold text-slate-800">分组统计</h2>

      <div className="flex flex-wrap gap-3">
        <select
          value={filterGroup}
          onChange={(e) => setFilterGroup(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          <option value="">全部实验组</option>
          {GROUPS.map((g) => (
            <option key={g} value={g}>{g}</option>
          ))}
        </select>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
        >
          <option value="">全部采样地点</option>
          {LOCATIONS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateStart}
          onChange={(e) => setDateStart(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          placeholder="开始日期"
        />
        <input
          type="date"
          value={dateEnd}
          onChange={(e) => setDateEnd(e.target.value)}
          className="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400/40"
          placeholder="结束日期"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-4">各组异常数量</h3>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={filteredStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="group_name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="normal" fill="#10B981" name="正常" radius={[4, 4, 0, 0]} />
                <Bar dataKey="anomaly" fill="#EF4444" name="异常" radius={[4, 4, 0, 0]} />
                <Bar dataKey="pending_review" fill="#F59E0B" name="待复核" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-sm font-medium text-slate-600 mb-4">异常率趋势</h3>
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="anomaly_rate"
                  stroke="#EF4444"
                  name="异常率(%)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
                <Line
                  type="monotone"
                  dataKey="anomaly_count"
                  stroke="#F59E0B"
                  name="异常数"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm">
            <button
              onClick={() => setPanelOpen(!panelOpen)}
              className="w-full flex items-center justify-between px-6 py-4 text-left"
            >
              <h3 className="font-medium text-slate-800">分析说明</h3>
              {panelOpen ? (
                <ChevronUp size={18} className="text-slate-400" />
              ) : (
                <ChevronDown size={18} className="text-slate-400" />
              )}
            </button>
            {panelOpen && (
              <div className="px-6 pb-5 space-y-4 text-sm">
                <div>
                  <p className="font-medium text-slate-700 mb-1">当前图表说明</p>
                  <p className="text-slate-500">
                    柱状图展示各实验组的正常、异常和待复核记录数量。折线图展示异常率随时间的变化趋势。
                  </p>
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">关键发现</p>
                  {maxAnomalyGroup.group_name ? (
                    <p className="text-slate-500">
                      {maxAnomalyGroup.group_name}异常率最高（{maxAnomalyGroup.anomaly_rate}%），主要原因为试剂批号不匹配。
                    </p>
                  ) : (
                    <p className="text-slate-500">暂无足够数据生成关键发现。</p>
                  )}
                </div>
                <div>
                  <p className="font-medium text-slate-700 mb-1">受影响记录</p>
                  <p className="text-slate-500">
                    共 {totalAnomaly} 条异常记录，占总量 {totalRecords > 0 ? ((totalAnomaly / totalRecords) * 100).toFixed(1) : 0}%。
                  </p>
                </div>
                <div className="pt-2 border-t border-slate-100">
                  <p className="font-medium text-slate-700 mb-1">建议</p>
                  <p className="text-slate-500">
                    建议优先处理异常率较高的实验组，核实试剂批号一致性，补充缺失的采样地点信息。
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-medium text-slate-800 mb-3 text-sm">数据摘要</h3>
            <div className="space-y-2 text-sm">
              {filteredStats.map((g) => (
                <div key={g.group_name} className="flex justify-between items-center">
                  <span className="text-slate-600">{g.group_name}</span>
                  <span className={`font-medium ${g.anomaly_rate > 30 ? 'text-red-600' : g.anomaly_rate > 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {g.anomaly_rate}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
