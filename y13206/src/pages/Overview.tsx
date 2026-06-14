import { useStore } from '@/store/useStore'
import { filterRecords } from '@/utils/timecode'
import type { ConflictRecord } from '@/types'
import StatsPanel from '@/components/StatsPanel'
import FilterBar from '@/components/FilterBar'
import ConflictCard from '@/components/ConflictCard'
import { Inbox, RotateCcw } from 'lucide-react'

export default function Overview() {
  const records = useStore((s) => s.records)
  const filter = useStore((s) => s.filter)
  const openForm = useStore((s) => s.openForm)
  const addSupplementaryRemark = useStore((s) => s.addSupplementaryRemark)
  const resetToDemo = useStore((s) => s.resetToDemo)

  const filtered = filterRecords(records, filter)

  const handleEdit = (record: ConflictRecord) => {
    openForm(record)
  }

  const handleAddSupplementaryRemark = (record: ConflictRecord) => {
    const content = prompt('请输入后补备注内容：')
    if (!content) return
    const changeDescription = prompt('请输入变更说明：')
    if (!changeDescription) return
    const operator = prompt('请输入操作人：') || '未知'
    addSupplementaryRemark(record.id, content, changeDescription, operator)
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1
            className="text-2xl font-bold text-[#e8e8e8]"
            style={{ fontFamily: "'Noto Serif SC', serif" }}
          >
            排期冲突总览
          </h1>
          <button
            onClick={() => {
              if (confirm('确认重置为演示数据？当前所有修改将丢失。')) resetToDemo()
            }}
            className="flex items-center gap-1 rounded-lg border border-[#555] px-3 py-1.5 text-xs text-[#e8e8e8] hover:border-[#f0a500]/60"
          >
            <RotateCcw className="h-3.5 w-3.5" />重置演示数据
          </button>
        </div>

        <StatsPanel />
        <FilterBar />

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-[#e8e8e8]/40">
            <Inbox size={48} className="mb-3" />
            <p className="text-lg">暂无匹配记录</p>
            <p className="text-sm mt-1">尝试调整筛选条件查看更多结果</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((record) => (
              <ConflictCard
                key={record.id}
                record={record}
                onEdit={handleEdit}
                onAddSupplementaryRemark={handleAddSupplementaryRemark}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
