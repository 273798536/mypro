import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import { ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'

export interface Column<T> {
  key: string
  title: string
  width?: number
  sortable?: boolean
  render?: (value: unknown, record: T, index: number) => React.ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  data: T[]
  total: number
  page: number
  pageSize: number
  onPageChange: (page: number) => void
  onSort?: (key: string, direction: 'asc' | 'desc') => void
  rowKey: keyof T | ((record: T) => string)
  selectable?: boolean
  selectedKeys?: string[]
  onSelectionChange?: (keys: string[]) => void
  loading?: boolean
  className?: string
}

export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  total,
  page,
  pageSize,
  onPageChange,
  onSort,
  rowKey,
  selectable = false,
  selectedKeys = [],
  onSelectionChange,
  loading = false,
  className,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  const totalPages = Math.ceil(total / pageSize)

  function getRowKey(record: T): string {
    if (typeof rowKey === 'function') return rowKey(record)
    return String(record[rowKey])
  }

  function handleSort(key: string) {
    const newDir = sortKey === key && sortDir === 'asc' ? 'desc' : 'asc'
    setSortKey(key)
    setSortDir(newDir)
    onSort?.(key, newDir)
  }

  const allSelected = data.length > 0 && data.every((r) => selectedKeys.includes(getRowKey(r)))

  function toggleAll() {
    if (allSelected) {
      onSelectionChange?.([])
    } else {
      onSelectionChange?.(data.map(getRowKey))
    }
  }

  function toggleOne(key: string) {
    if (selectedKeys.includes(key)) {
      onSelectionChange?.(selectedKeys.filter((k) => k !== key))
    } else {
      onSelectionChange?.([...selectedKeys, key])
    }
  }

  const pageRange = useMemo(() => {
    const pages: number[] = []
    const start = Math.max(1, page - 2)
    const end = Math.min(totalPages, page + 2)
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [page, totalPages])

  if (loading) {
    return (
      <div className={cn('card overflow-hidden', className)}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-surface-border">
                {columns.map((col) => (
                  <th key={col.key} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="skeleton h-3 w-16" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-surface-border last:border-0">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3">
                      <div className="skeleton h-4 w-full max-w-[120px]" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('card overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-surface-border">
              {selectable && (
                <th className="w-10 px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  style={col.width ? { width: col.width } : undefined}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                    col.sortable && 'cursor-pointer select-none hover:text-gray-700'
                  )}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className="flex items-center gap-1">
                    <span>{col.title}</span>
                    {col.sortable && (
                      <span className="flex flex-col">
                        <ChevronUp className={cn('w-3 h-3 -mb-0.5', sortKey === col.key && sortDir === 'asc' ? 'text-primary' : 'text-gray-300')} />
                        <ChevronDown className={cn('w-3 h-3 -mt-0.5', sortKey === col.key && sortDir === 'desc' ? 'text-primary' : 'text-gray-300')} />
                      </span>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="px-4 py-12 text-center text-gray-400">
                  暂无数据
                </td>
              </tr>
            ) : (
              data.map((record, index) => {
                const key = getRowKey(record)
                const isSelected = selectedKeys.includes(key)
                return (
                  <tr
                    key={key}
                    className={cn(
                      'border-b border-surface-border last:border-0 transition-colors duration-150',
                      isSelected ? 'bg-primary-50/50' : 'hover:bg-surface-hover',
                      index % 2 === 1 && !isSelected && 'bg-gray-50/40'
                    )}
                  >
                    {selectable && (
                      <td className="w-10 px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(key)}
                          className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-sm text-gray-700">
                        {col.render
                          ? col.render(record[col.key], record, index)
                          : String(record[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border">
          <span className="text-sm text-gray-500">
            共 <span className="font-mono font-medium">{total}</span> 条
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {pageRange.map((p) => (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={cn(
                  'w-8 h-8 rounded text-sm font-medium transition-colors duration-200',
                  p === page
                    ? 'bg-primary text-white'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              className="p-1.5 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
