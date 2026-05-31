import { useStore, maintenanceRecords as allMaintenanceRecords } from '@/store/useStore'
import { Wrench, Clock, CheckCircle, XCircle } from 'lucide-react'

const RESULT_STYLES: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
  '已校准': { bg: 'bg-green-900/50', text: 'text-green-400', icon: <CheckCircle className="w-3 h-3" /> },
  '校准失效': { bg: 'bg-red-900/50', text: 'text-red-400', icon: <XCircle className="w-3 h-3" /> },
  '待处理': { bg: 'bg-amber-900/50', text: 'text-amber-400', icon: <Clock className="w-3 h-3" /> },
  '部分补采': { bg: 'bg-purple-900/50', text: 'text-purple-400', icon: <Wrench className="w-3 h-3" /> },
}

function formatDate(ts: number): string {
  const d = new Date(ts)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

export default function MaintenancePanel() {
  const selectedCellId = useStore((s) => s.selectedCellId)
  const currentTime = useStore((s) => s.currentTime)

  const records = selectedCellId
    ? allMaintenanceRecords.filter((m) => m.cellId === selectedCellId)
    : []

  const sortedRecords = [...records].sort((a, b) => b.date - a.date)

  const closestRecordId = (() => {
    if (sortedRecords.length === 0) return null
    let closest = sortedRecords[0]
    let minDiff = Math.abs(sortedRecords[0].date - currentTime)
    for (const r of sortedRecords) {
      const diff = Math.abs(r.date - currentTime)
      if (diff < minDiff) {
        minDiff = diff
        closest = r
      }
    }
    const span = 2 * 3600 * 1000
    return minDiff <= span ? closest.id : null
  })()

  if (!selectedCellId) {
    return (
      <div className="bg-[#0d1117] border border-gray-700 rounded-lg p-4 h-full flex items-center justify-center">
        <p className="text-gray-500 text-sm">点击 3D 电芯查看维修记录</p>
      </div>
    )
  }

  return (
    <div className="bg-[#0d1117] border border-gray-700 rounded-lg p-4 h-full flex flex-col">
      <h3 className="text-sm font-semibold text-gray-200 mb-3 flex items-center gap-2">
        <Wrench className="w-4 h-4 text-gray-400" />
        维修记录
      </h3>

      {sortedRecords.length === 0 ? (
        <p className="text-gray-500 text-sm flex-1 flex items-center justify-center">暂无维修记录</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-2">
          {sortedRecords.map((record) => {
            const style = RESULT_STYLES[record.result]
            const isHighlighted = record.id === closestRecordId

            return (
              <div
                key={record.id}
                className={`border rounded-md p-3 transition-colors ${
                  isHighlighted
                    ? 'border-blue-500 bg-blue-950/30'
                    : 'border-gray-700 bg-gray-800/40'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {formatDate(record.date)}
                  </span>
                  {style && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${style.bg} ${style.text}`}
                    >
                      {style.icon}
                      {record.result}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-300 font-medium mb-1">{record.type}</p>
                <p className="text-xs text-gray-500 leading-relaxed">{record.description}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
