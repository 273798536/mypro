import { useEffect } from 'react'
import { useOffTargetStore } from '@/store/offTargetStore'
import { useNavigate } from 'react-router-dom'
import FilterBar from '@/components/FilterBar'
import CandidateTable from '@/components/CandidateTable'
import StatisticsCharts from '@/components/StatisticsCharts'
import { AlertTriangle, CheckCircle, FileSearch, Activity } from 'lucide-react'

export default function OverviewPage() {
  const store = useOffTargetStore()
  const navigate = useNavigate()

  useEffect(() => {
    store.initialize()
  }, [])

  const filtered = store.getFilteredCandidates()
  const totalCandidates = filtered.length
  const anomalyCount = filtered.filter((c) => c.status === 'anomaly').length
  const approvedCount = filtered.filter((c) => c.status === 'approved').length
  const abnormalNegControl = filtered.filter((c) => c.negControlResult === 'abnormal').length

  const stats = [
    { label: '候选总数', value: totalCandidates, icon: FileSearch, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: '异常记录', value: anomalyCount, icon: AlertTriangle, color: 'text-orange-600', bg: 'bg-orange-50' },
    { label: '已复核通过', value: approvedCount, icon: CheckCircle, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: '阴性对照异常', value: abnormalNegControl, icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
  ]

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-zinc-800">CRISPR 脱靶候选表</h1>
          <p className="text-sm text-zinc-500 mt-1">围绕试剂批号追溯，图表与明细共享同一数据源</p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-zinc-200 p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div>
              <p className="text-2xl font-semibold text-zinc-800 font-mono-data">{s.value}</p>
              <p className="text-xs text-zinc-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <StatisticsCharts />

      <FilterBar />

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between">
          <p className="text-sm text-zinc-600">
            共 <span className="font-medium text-zinc-800">{filtered.length}</span> 条记录
          </p>
        </div>
        <CandidateTable
          candidates={filtered}
          reagentBatches={store.reagentBatches}
          onRowClick={(id) => navigate(`/candidate/${id}`)}
        />
      </div>
    </div>
  )
}
