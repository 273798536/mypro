import { useState } from 'react'
import { useMistakeData } from '../hooks/useMistakeData'
import { ProcessStatus, DataSource, SortField, SortOrder } from '../types'

const statusOptions = [
  { value: 'pending', label: '待处理' },
  { value: 'unit_checking', label: '单位校验中' },
  { value: 'needs_manual_confirm', label: '待人工确认' },
  { value: 'processing', label: '处理中' },
  { value: 'reviewed', label: '已复盘' },
  { value: 'completed', label: '已完成' },
  { value: 'archived', label: '已归档' },
]

const sourceOptions = [
  { value: 'manual', label: '手工录入' },
  { value: 'import_old', label: '旧系统导入' },
  { value: 'import_new', label: '新系统导入' },
  { value: 'api_sync', label: '接口同步' },
]

const difficultyOptions = [
  { value: 'easy', label: '简单' },
  { value: 'medium', label: '中等' },
  { value: 'hard', label: '困难' },
]

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'queueNumber', label: '排队号' },
  { value: 'createdAt', label: '创建时间' },
  { value: 'status', label: '状态' },
  { value: 'difficulty', label: '难度' },
]

export default function FilterBar() {
  const { filters, setFilters, sortField, sortOrder, setSortField, setSortOrder } = useMistakeData()
  const [showMore, setShowMore] = useState(false)

  const toggleStatus = (status: ProcessStatus) => {
    const current = filters.status || []
    const next = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status]
    setFilters({ ...filters, status: next.length > 0 ? next : undefined })
  }

  const toggleSource = (source: DataSource) => {
    const current = filters.dataSource || []
    const next = current.includes(source)
      ? current.filter(s => s !== source)
      : [...current, source]
    setFilters({ ...filters, dataSource: next.length > 0 ? next : undefined })
  }

  const toggleDifficulty = (diff: string) => {
    const current = filters.difficulty || []
    const next = current.includes(diff)
      ? current.filter(d => d !== diff)
      : [...current, diff]
    setFilters({ ...filters, difficulty: next.length > 0 ? next : undefined })
  }

  const toggleUnitIssue = () => {
    setFilters({ ...filters, hasUnitIssue: filters.hasUnitIssue === true ? undefined : true })
  }

  const toggleLateAttachment = () => {
    setFilters({ ...filters, hasLateAttachment: filters.hasLateAttachment === true ? undefined : true })
  }

  const handleKeywordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ ...filters, keyword: e.target.value || undefined })
  }

  const handleSortChange = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const clearFilters = () => {
    setFilters({})
  }

  const hasActiveFilters = Object.values(filters).some(v => 
    Array.isArray(v) ? v.length > 0 : v !== undefined
  )

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
      <div className="flex flex-col lg:flex-row lg:items-center gap-4">
        <div className="flex-1">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="搜索题目、章节..."
              value={filters.keyword || ''}
              onChange={handleKeywordChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">排序:</span>
          <div className="flex rounded-md shadow-sm">
            {sortOptions.map(opt => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                className={`px-3 py-1.5 text-xs font-medium border ${
                  sortField === opt.value
                    ? 'bg-primary-50 text-primary-700 border-primary-300'
                    : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                } ${opt.value === sortOptions[0].value ? 'rounded-l-md' : ''} ${
                  opt.value === sortOptions[sortOptions.length - 1].value ? 'rounded-r-md' : ''
                } -ml-px first:ml-0 transition-colors`}
              >
                {opt.label}
                {sortField === opt.value && (
                  <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setShowMore(!showMore)}
          className="lg:hidden px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50"
        >
          筛选 {showMore ? '▲' : '▼'}
        </button>
      </div>

      <div className={`${showMore ? 'block' : 'hidden'} lg:block mt-4 pt-4 border-t border-gray-100`}>
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 w-16 flex-shrink-0">状态:</span>
            <div className="flex flex-wrap gap-1">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => toggleStatus(opt.value as ProcessStatus)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    filters.status?.includes(opt.value as ProcessStatus)
                      ? 'bg-primary-100 text-primary-700 border-primary-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 w-16 flex-shrink-0">来源:</span>
            <div className="flex flex-wrap gap-1">
              {sourceOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => toggleSource(opt.value as DataSource)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    filters.dataSource?.includes(opt.value as DataSource)
                      ? 'bg-purple-100 text-purple-700 border-purple-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500 w-16 flex-shrink-0">难度:</span>
            <div className="flex flex-wrap gap-1">
              {difficultyOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => toggleDifficulty(opt.value)}
                  className={`px-2.5 py-1 text-xs rounded-full border transition-colors ${
                    filters.difficulty?.includes(opt.value)
                      ? 'bg-orange-100 text-orange-700 border-orange-300'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="text-xs text-gray-500 w-16 flex-shrink-0">快速筛选:</span>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={toggleUnitIssue}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                  filters.hasUnitIssue
                    ? 'bg-warning-50 text-warning-700 border-warning-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                ⚠️ 单位有问题
              </button>
              <button
                onClick={toggleLateAttachment}
                className={`px-3 py-1.5 text-xs rounded-md border transition-colors flex items-center gap-1 ${
                  filters.hasLateAttachment
                    ? 'bg-purple-50 text-purple-700 border-purple-300'
                    : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                }`}
              >
                📎 晚到附件
              </button>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex justify-end pt-2">
              <button
                onClick={clearFilters}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                清除所有筛选
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
