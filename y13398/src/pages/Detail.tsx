import { useEffect } from 'react'
import { useDashboardStore } from '@/store/useDashboardStore'
import RecordTable from '@/components/RecordTable'
import { Download, Search, Filter } from 'lucide-react'
import type { ChangeType, RecordStatus } from '../../shared/types'

export default function Detail() {
  const records = useDashboardStore(s => s.records)
  const recordsTotal = useDashboardStore(s => s.recordsTotal)
  const filters = useDashboardStore(s => s.filters)
  const loading = useDashboardStore(s => s.loading)
  const fetchRecords = useDashboardStore(s => s.fetchRecords)
  const setFilter = useDashboardStore(s => s.setFilter)
  const exportRecords = useDashboardStore(s => s.exportRecords)

  useEffect(() => {
    fetchRecords()
  }, [filters, fetchRecords])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[#E0E7EF] text-xl font-bold mb-1" style={{ fontFamily: "'Source Serif 4', serif" }}>
            明细列表
          </h2>
          <p className="text-[#5A7080] text-sm">共 {recordsTotal} 条记录 · 原始数据完整保留</p>
        </div>
        <button
          onClick={exportRecords}
          className="flex items-center gap-2 bg-[#1B3A4B] hover:bg-[#234E64] text-[#7DD3FC] text-sm px-4 py-2 rounded-lg border border-[#1B3A4B] hover:border-[#7DD3FC]/30 transition-all shadow-md"
        >
          <Download size={16} />
          导出摘要
        </button>
      </div>

      <div className="bg-[#0D1B2A]/80 border border-[#1B3A4B] rounded-xl p-4 shadow-lg">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2 text-[#5A7080]">
            <Filter size={14} />
            <span className="text-xs">筛选</span>
          </div>

          <select
            value={filters.type}
            onChange={e => setFilter('type', e.target.value)}
            className="bg-[#132D42] text-[#B0C4D8] text-sm rounded-lg px-3 py-2 border border-[#1B3A4B] focus:border-[#7DD3FC]/50 focus:outline-none transition-colors"
          >
            <option value="">全部类型</option>
            <option value="sample">样本</option>
            <option value="threshold">阈值</option>
            <option value="manual">人工修正</option>
            <option value="metric">指标</option>
          </select>

          <select
            value={filters.status}
            onChange={e => setFilter('status', e.target.value)}
            className="bg-[#132D42] text-[#B0C4D8] text-sm rounded-lg px-3 py-2 border border-[#1B3A4B] focus:border-[#7DD3FC]/50 focus:outline-none transition-colors"
          >
            <option value="">全部状态</option>
            <option value="processed">已处理</option>
            <option value="pending">待补充</option>
            <option value="anomalous">异常</option>
          </select>

          <div className="flex items-center gap-2 bg-[#132D42] rounded-lg px-3 py-2 border border-[#1B3A4B] focus-within:border-[#7DD3FC]/50 transition-colors flex-1 min-w-[200px]">
            <Search size={14} className="text-[#5A7080]" />
            <input
              type="text"
              value={filters.source}
              onChange={e => setFilter('source', e.target.value)}
              placeholder="搜索来源..."
              className="bg-transparent text-[#B0C4D8] text-sm outline-none placeholder:text-[#3D5568] w-full"
            />
          </div>
        </div>
      </div>

      <div className="bg-[#0D1B2A]/80 border border-[#1B3A4B] rounded-xl shadow-lg overflow-hidden">
        {loading.records ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#7DD3FC] border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <RecordTable />
        )}
      </div>
    </div>
  )
}
