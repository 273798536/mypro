import { useState, useEffect } from 'react'
import SummaryBar from '@/components/SummaryBar'
import WarningCard from '@/components/WarningCard'
import SidePanel from '@/components/SidePanel'
import AddRecordPanel from '@/components/AddRecordPanel'
import { useAppStore } from '@/store'
import { RotateCcw } from 'lucide-react'

export default function App() {
  const { records, confirmSuspended, rejectSuspended, resetToSeed, ensureInitialized } = useAppStore()

  useEffect(() => {
    ensureInitialized()
  }, [ensureInitialized])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const selectedRecord = records.find((r) => r.id === expandedId) || null

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="max-w-7xl mx-auto px-4 py-5 space-y-5">
        <SummaryBar />

        <div className="flex items-center justify-between">
          <AddRecordPanel />
          <button
            onClick={resetToSeed}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-steel hover:text-navy transition-colors"
            title="重置为初始测试数据"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            重置数据
          </button>
        </div>

        <div className="flex gap-5">
          <div className="flex-1 min-w-0 space-y-3">
            {records.length === 0 ? (
              <div className="bg-white rounded-xl border border-surface-dark p-8 text-center text-steel text-sm">
                暂无预警记录，点击"记录预警"添加
              </div>
            ) : (
              records.map((record) => (
                <WarningCard
                  key={record.id}
                  record={record}
                  onConfirm={confirmSuspended}
                  onReject={rejectSuspended}
                  onExpand={toggleExpand}
                  isExpanded={expandedId === record.id}
                />
              ))
            )}
          </div>

          <div className="w-80 shrink-0 hidden lg:block">
            <SidePanel selectedRecord={selectedRecord} />
          </div>
        </div>
      </div>
    </div>
  )
}
