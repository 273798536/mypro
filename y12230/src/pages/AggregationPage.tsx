import ProjectSummary from '@/components/ProjectSummary'
import DataEntry from '@/components/DataEntry'
import AlertBanner from '@/components/AlertBanner'
import { useStore } from '@/store'
import { AlertTriangle } from 'lucide-react'

export default function AggregationPage() {
  const alerts = useStore((s) => s.alerts)
  const unresolvedCount = alerts.filter((a) => !a.resolved).length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-[#1a2332]">费用归集</h1>
        {unresolvedCount > 0 && (
          <div className="flex items-center gap-2 rounded-full bg-[#e8635a]/10 px-3 py-1 text-sm text-[#e8635a]">
            <AlertTriangle size={14} />
            <span>{unresolvedCount} 条待处理异常</span>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#1a2332]">项目费用汇总</h2>
        <ProjectSummary />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#1a2332]">口径校验</h2>
        <AlertBanner />
      </div>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-[#1a2332]">数据源录入</h2>
        <DataEntry />
      </div>
    </div>
  )
}
