import { useEffect } from 'react'
import { useDashboardStore } from '@/store/useDashboardStore'
import StatusCard from '@/components/StatusCard'
import TrendChart from '@/components/TrendChart'
import AlertList from '@/components/AlertList'

export default function Dashboard() {
  const summary = useDashboardStore(s => s.summary)
  const loading = useDashboardStore(s => s.loading)
  const fetchSummary = useDashboardStore(s => s.fetchSummary)

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  if (loading.summary || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-[#7DD3FC] border-t-transparent rounded-full animate-spin" />
          <p className="text-[#7B8FA3] text-sm">加载看板数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[#E0E7EF] text-xl font-bold mb-1" style={{ fontFamily: "'Source Serif 4', serif" }}>
          看板总览
        </h2>
        <p className="text-[#5A7080] text-sm">训练数据质量与影子流量成本追踪</p>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <StatusCard label="总计" value={summary.total} variant="total" />
        <StatusCard label="已处理" value={summary.processed} variant="processed" />
        <StatusCard label="待补充证据" value={summary.pendingEvidence} variant="pending" />
        <StatusCard label="异常" value={summary.anomalous} variant="anomalous" />
      </div>

      <div className="grid grid-cols-5 gap-6">
        <div className="col-span-3">
          <TrendChart data={summary.trend} />
        </div>
        <div className="col-span-2">
          <AlertList alerts={summary.alerts} />
        </div>
      </div>
    </div>
  )
}
