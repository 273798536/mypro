import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { SampleItem, StatusType } from '@/types'
import StatusBadge from './StatusBadge'
import { Search, Filter, TestTube } from 'lucide-react'

interface SampleListProps {
  samples: SampleItem[]
  className?: string
  onSampleClick?: (sample: SampleItem) => void
}

const statusFilters: { value: StatusType | 'all'; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'success', label: '正常' },
  { value: 'warning', label: '警告' },
  { value: 'error', label: '异常' },
  { value: 'pending', label: '待检' },
]

export default function SampleList({
  samples,
  className,
  onSampleClick,
}: SampleListProps) {
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusType | 'all'>('all')

  const filteredSamples = useMemo(() => {
    return samples.filter((sample) => {
      const matchSearch =
        sample.name.toLowerCase().includes(searchText.toLowerCase()) ||
        sample.barcode.toLowerCase().includes(searchText.toLowerCase())
      const matchStatus =
        statusFilter === 'all' || sample.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [samples, searchText, statusFilter])

  return (
    <div className={cn('glass-card overflow-hidden', className)}>
      <div className="p-4 border-b border-white/10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TestTube className="w-5 h-5 text-teal-400" />
            <h3 className="text-base font-semibold text-white">样本清单</h3>
            <span className="text-xs text-lab-400 bg-white/10 px-2 py-0.5 rounded-full">
              {filteredSamples.length} / {samples.length}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-lab-400" />
            <input
              type="text"
              placeholder="搜索样本名称或条码..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-lab-500 focus:outline-none focus:border-teal-500/50 focus:ring-1 focus:ring-teal-500/30 transition-all duration-200"
            />
          </div>

          <div className="flex items-center gap-1">
            <Filter className="w-4 h-4 text-lab-400 mr-1" />
            {statusFilters.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setStatusFilter(filter.value)}
                className={cn(
                  'px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-200',
                  statusFilter === filter.value
                    ? 'bg-teal-500/20 text-teal-400 border border-teal-500/30'
                    : 'text-lab-300 hover:bg-white/5 hover:text-white'
                )}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-lab-950/90 backdrop-blur-sm z-10">
            <tr>
              <th className="text-left font-medium text-lab-300 px-4 py-3 border-b border-white/10">
                样本名称
              </th>
              <th className="text-left font-medium text-lab-300 px-4 py-3 border-b border-white/10">
                条码
              </th>
              <th className="text-left font-medium text-lab-300 px-4 py-3 border-b border-white/10">
                类型
              </th>
              <th className="text-left font-medium text-lab-300 px-4 py-3 border-b border-white/10">
                采集时间
              </th>
              <th className="text-left font-medium text-lab-300 px-4 py-3 border-b border-white/10">
                状态
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredSamples.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-lab-400">
                  暂无匹配的样本
                </td>
              </tr>
            ) : (
              filteredSamples.map((sample) => (
                <tr
                  key={sample.id}
                  onClick={() => onSampleClick?.(sample)}
                  className={cn(
                    'border-b border-white/5 transition-all duration-200',
                    onSampleClick && 'cursor-pointer hover:bg-white/5'
                  )}
                >
                  <td className="px-4 py-3 font-medium text-white">
                    {sample.name}
                  </td>
                  <td className="px-4 py-3 text-lab-300 font-mono text-xs">
                    {sample.barcode}
                  </td>
                  <td className="px-4 py-3 text-lab-300">{sample.type}</td>
                  <td className="px-4 py-3 text-lab-400 text-xs">
                    {sample.collectTime || '-'}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={sample.status} size="sm" />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
