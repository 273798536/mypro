import AnomalyQueue from '@/components/AnomalyQueue'
import { ClipboardList } from 'lucide-react'
import { useStore } from '@/store/useStore'

export default function QueuePage() {
  const anomalies = useStore((s) => s.anomalies)
  const processed = anomalies.filter((a) => a.status === 'processed').length
  const pending = anomalies.filter((a) => a.status === 'pending_material').length
  const override = anomalies.filter((a) => a.status === 'manual_override').length

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
