import AnomalyQueue from '@/components/AnomalyQueue'
import { ClipboardList, Download } from 'lucide-react'
import { useStore } from '@/store/useStore'
import { downloadCsv, statusLabelMap } from '@/utils/exportCsv'

export default function QueuePage() {
  const anomalies = useStore((s) => s.anomalies)
  const processed = anomalies.filter((a) => a.status === 'processed').length
  const pending = anomalies.filter((a) => a.status === 'pending_material').length
  const override = anomalies.filter((a) => a.status === 'manual_override').length

  const handleExport = () => {
    const header = ['电池ID', '异常类型', '当前状态', '处理人', '处理时间', '备注']
    const rows = anomalies.map((a) => [
      a.cellId,
      a.anomalyType,
      statusLabelMap[a.status] ?? a.status,
      a.handler || '-',
      a.handledAt ? new Date(a.handledAt).toLocaleString('zh-CN') : '-',
      a.note || '-',
    ])
    downloadCsv([header, ...rows], `异常队列_${Date.now()}.csv`)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-gray-800 px-6 py-3" style={{ background: '#1a1a2e' }}>
        <div className="flex items-center gap-3">
          <ClipboardList className="h-5 w-5 text-amber-500" />
          <div>
            <h1 className="text-lg font-bold text-white">异常队列</h1>
            <p className="text-xs text-gray-500">已处理 · 待补材料 · 人工改判</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 rounded-md bg-amber-500/20 px-3 py-1.5 font-medium text-amber-400 transition-colors hover:bg-amber-500/30"
          >
            <Download className="h-3.5 w-3.5" />
            导出CSV
          </button>
          <span className="text-green-400">已处理: {processed}</span>
          <span className="text-amber-400">待补材料: {pending}</span>
          <span className="text-purple-400">人工改判: {override}</span>
        </div>
      </header>

      <div className="flex-1 overflow-auto">
        <AnomalyQueue />
      </div>
    </div>
  )
}
